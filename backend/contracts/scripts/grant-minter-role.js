const hre = require("hardhat");

async function main() {
  if (!process.env.X_LAYER_DEPLOYER_PRIVATE_KEY) {
    throw new Error("Set X_LAYER_DEPLOYER_PRIVATE_KEY to the admin/deployer wallet private key.");
  }

  const minterAddress = process.env.THIRDWEB_DEPLOYER_ADDRESS || "0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467";
  const genesisAddress = process.env.GENESIS_CONTRACT_ADDRESS || "0xE4C2e906eabfC825193A7b8410274529889dc294";
  const chapterAddress = process.env.CHAPTER_CONTRACT_ADDRESS || "0x6A9c67B95C5669d63BaFa641d9B5aae4160Fce44";

  const [admin] = await hre.ethers.getSigners();
  console.log(`Admin Wallet: ${admin.address}`);
  console.log(`Target Minter Wallet: ${minterAddress}`);

  const minterRole = hre.ethers.id("MINTER_ROLE");

  const genesis = await hre.ethers.getContractAt("LoreloomGenesis", genesisAddress, admin);
  const chapter = await hre.ethers.getContractAt("LoreloomChapter", chapterAddress, admin);

  console.log("\nGranting MINTER_ROLE on LoreloomGenesis...");
  const tx1 = await genesis.grantRole(minterRole, minterAddress);
  await tx1.wait();
  console.log(`Genesis grantRole Tx: ${tx1.hash}`);

  console.log("\nGranting MINTER_ROLE on LoreloomChapter...");
  const tx2 = await chapter.grantRole(minterRole, minterAddress);
  await tx2.wait();
  console.log(`Chapter grantRole Tx: ${tx2.hash}`);

  console.log("\nVerifying roles...");
  const genesisHasRole = await genesis.hasRole(minterRole, minterAddress);
  const chapterHasRole = await chapter.hasRole(minterRole, minterAddress);

  console.log(`Genesis hasRole(MINTER_ROLE, ${minterAddress}): ${genesisHasRole}`);
  console.log(`Chapter hasRole(MINTER_ROLE, ${minterAddress}): ${chapterHasRole}`);

  if (genesisHasRole && chapterHasRole) {
    console.log("\nSUCCESS: MINTER_ROLE successfully granted on both contracts!");
  } else {
    console.error("\nERROR: Role grant verification failed!");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
