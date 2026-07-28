const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loreloom Genesis and Chapter", function () {
  async function deployFixture() {
    const [admin, collector, other] = await ethers.getSigners();
    const Genesis = await ethers.getContractFactory("LoreloomGenesis");
    const genesis = await Genesis.deploy("Loreloom Genesis", "LORE-G", admin.address);
    const Chapter = await ethers.getContractFactory("LoreloomChapter");
    const chapter = await Chapter.deploy("Loreloom Chapter", "LORE-C", await genesis.getAddress(), admin.address);
    return { admin, collector, other, genesis, chapter };
  }

  it("mints immutable Genesis metadata sequentially", async function () {
    const { collector, genesis } = await deployFixture();
    await expect(genesis.mint(collector.address, "ipfs://genesis-1"))
      .to.emit(genesis, "GenesisMinted")
      .withArgs(1n, collector.address, "ipfs://genesis-1");

    expect(await genesis.ownerOf(1n)).to.equal(collector.address);
    expect(await genesis.tokenURI(1n)).to.equal("ipfs://genesis-1");
  });

  it("only allows a minter to mint Genesis tokens", async function () {
    const { collector, other, genesis } = await deployFixture();
    await expect(genesis.connect(other).mint(collector.address, "ipfs://genesis-1"))
      .to.be.revertedWithCustomError(genesis, "AccessControlUnauthorizedAccount");
  });

  it("mints a chapter only to the current Genesis owner and records its parent", async function () {
    const { collector, other, genesis, chapter } = await deployFixture();
    await genesis.mint(collector.address, "ipfs://genesis-1");

    await expect(chapter.mintChapter(collector.address, 1n, "ipfs://chapter-1"))
      .to.emit(chapter, "ChapterMinted")
      .withArgs(1n, 1n, collector.address, "ipfs://chapter-1");

    expect(await chapter.parentGenesisTokenId(1n)).to.equal(1n);
    expect(await chapter.tokenURI(1n)).to.equal("ipfs://chapter-1");

    await expect(chapter.mintChapter(other.address, 1n, "ipfs://chapter-2"))
      .to.be.revertedWith("LoreloomChapter: recipient is not Genesis owner");
  });

  it("uses the latest Genesis owner when the root token is transferred", async function () {
    const { collector, other, genesis, chapter } = await deployFixture();
    await genesis.mint(collector.address, "ipfs://genesis-1");
    await genesis.connect(collector).transferFrom(collector.address, other.address, 1n);

    await expect(chapter.mintChapter(other.address, 1n, "ipfs://chapter-1"))
      .to.emit(chapter, "ChapterMinted")
      .withArgs(1n, 1n, other.address, "ipfs://chapter-1");
  });
});
