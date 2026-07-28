const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const deploymentPath = path.resolve(__dirname, "../deployments/xlayer-testnet.json");

async function main() {
  if (!process.env.X_LAYER_DEPLOYER_PRIVATE_KEY) {
    throw new Error("Set X_LAYER_DEPLOYER_PRIVATE_KEY to a fresh, test-only X Layer EOA before deployment.");
  }
  if (fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment record already exists at ${deploymentPath}. Refusing to deploy duplicate contracts.`);
  }

  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 1952n) {
    throw new Error(`Refusing to deploy: expected X Layer testnet chain ID 1952, received ${network.chainId}.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const Genesis = await hre.ethers.getContractFactory("LoreloomGenesis");
  const genesis = await Genesis.deploy("Loreloom Genesis", "LORE-G", deployer.address);
  await genesis.waitForDeployment();

  const Chapter = await hre.ethers.getContractFactory("LoreloomChapter");
  const chapter = await Chapter.deploy(
    "Loreloom Chapter",
    "LORE-C",
    await genesis.getAddress(),
    deployer.address
  );
  await chapter.waitForDeployment();

  const genesisReceipt = await genesis.deploymentTransaction().wait();
  const chapterReceipt = await chapter.deploymentTransaction().wait();
  const deployment = {
    chainId: Number(network.chainId),
    rpcUrl: hre.network.config.url,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    genesis: { address: await genesis.getAddress(), txHash: genesisReceipt.hash },
    chapter: { address: await chapter.getAddress(), txHash: chapterReceipt.hash }
  };

  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
