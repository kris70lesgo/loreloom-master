require("@nomicfoundation/hardhat-toolbox");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

for (const file of [".env", ".env.local"]) {
  const envPath = path.resolve(__dirname, "..", file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: file.endsWith(".local") });
  }
}

const deployerPrivateKey = process.env.X_LAYER_DEPLOYER_PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./src",
    tests: "./test"
  },
  networks: {
    xlayerTestnet: {
      url: process.env.X_LAYER_RPC_URL ?? "https://xlayertestrpc.okx.com",
      chainId: 1952,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
};
