const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const projectRoot = path.resolve(__dirname, "../..");
const artifactsRoot = path.resolve(__dirname, "../artifacts/src");
const deploymentPath = path.resolve(__dirname, "../deployments/xlayer-testnet.json");

loadEnvironment();
const chainId = Number(process.env.X_LAYER_CHAIN_ID ?? 1952);
const rpcUrl = process.env.X_LAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";

async function main() {
  if (chainId !== 1952) {
    throw new Error(`Refusing to deploy: expected X Layer testnet chain ID 1952, received ${chainId}.`);
  }

  const genesisArtifact = readArtifact("LoreloomGenesis.sol", "LoreloomGenesis");
  const chapterArtifact = readArtifact("LoreloomChapter.sol", "LoreloomChapter");
  const deployer = requireEnv("THIRDWEB_DEPLOYER_ADDRESS");
  const execute = process.argv.includes("--execute");

  if (fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment record already exists at ${deploymentPath}. Refusing to deploy duplicate contracts.`);
  }

  const plan = {
    chainId,
    rpcUrl,
    deployer,
    contracts: [
      { name: "LoreloomGenesis", constructor: ["Loreloom Genesis", "LORE-G", deployer] },
      { name: "LoreloomChapter", constructor: ["Loreloom Chapter", "LORE-C", "<Genesis address>", deployer] }
    ]
  };

  if (!execute) {
    console.log(JSON.stringify({ mode: "dry-run", plan }, null, 2));
    return;
  }

  const secretKey = requireEnv("THIRDWEB_SECRET_KEY");
  const genesis = await deployWithThirdweb({
    secretKey,
    deployer,
    artifact: genesisArtifact,
    constructorParams: { name_: "Loreloom Genesis", symbol_: "LORE-G", initialAdmin: deployer }
  });
  await waitForCode(genesis.address);

  const chapter = await deployWithThirdweb({
    secretKey,
    deployer,
    artifact: chapterArtifact,
    constructorParams: {
      name_: "Loreloom Chapter",
      symbol_: "LORE-C",
      genesisContract_: genesis.address,
      initialAdmin: deployer
    }
  });
  await waitForCode(chapter.address);

  const deployment = {
    chainId,
    rpcUrl,
    deployer,
    deployedAt: new Date().toISOString(),
    genesis: { address: genesis.address, transactionId: genesis.transactionId },
    chapter: { address: chapter.address, transactionId: chapter.transactionId }
  };
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ mode: "deployed", deployment }, null, 2));
}

function loadEnvironment() {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(projectRoot, file);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: file.endsWith(".local") });
    }
  }
}

function readArtifact(sourceFile, contractName) {
  const artifactPath = path.join(artifactsRoot, sourceFile, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing compiled artifact: ${artifactPath}. Run npm run compile first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return { abi: artifact.abi, bytecode: artifact.bytecode };
}

async function deployWithThirdweb({ secretKey, deployer, artifact, constructorParams }) {
  const response = await fetch("https://api.thirdweb.com/v1/contracts", {
    method: "POST",
    headers: { "content-type": "application/json", "x-secret-key": secretKey },
    body: JSON.stringify({
      chainId,
      from: deployer,
      bytecode: artifact.bytecode,
      abi: artifact.abi,
      constructorParams
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.result?.address) {
    throw new Error(`thirdweb deployment failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload.result;
}

async function waitForCode(address) {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: attempt, method: "eth_getCode", params: [address, "latest"] })
    });
    const payload = await response.json();
    if (payload?.result && payload.result !== "0x") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Deployment address ${address} did not receive bytecode within two minutes.`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in .env.local.`);
  }
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
