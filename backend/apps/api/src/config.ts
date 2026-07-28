import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envRoots = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../../../.env")
];

for (const envPath of envRoots) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

for (const envPath of envRoots.map((envPath) => envPath.replace(/\.env$/, ".env.local"))) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

export type AiProvider = "openrouter" | "gemini" | "nvidia";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  supabase: {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      process.env.SUPABASE_ANON_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  worker: {
    id: process.env.WORKER_ID ?? `loreloom-worker-${process.pid}`,
    pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS ?? 2000),
    idleSleepMs: Number(process.env.WORKER_IDLE_SLEEP_MS ?? 500)
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
    appUrl: process.env.OPENROUTER_APP_URL ?? "http://localhost:3000",
    appName: process.env.OPENROUTER_APP_NAME ?? "Loreloom"
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite-001",
    imageModel: process.env.GEMINI_IMAGE_MODEL ?? process.env.GEMINI_IMAGE_FAST_MODEL ?? "gemini-2.0-flash-exp-image-generation",
    imageProModel: process.env.GEMINI_IMAGE_PRO_MODEL ?? "imagen-3.0-generate-001"
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY,
    model: process.env.NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct"
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY ?? process.env.HF_TOKEN,
    imageModel: process.env.HUGGINGFACE_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell"
  },
  stability: {
    apiKey: process.env.STABILITY_API_KEY
  },
  ipfs: {
    mode: process.env.IPFS_MODE ?? "pinata",
    pinataJwt: process.env.PINATA_JWT
  },
  mint: {
    mode: process.env.MINT_MODE ?? "thirdweb-transactions",
    thirdwebClientId: process.env.THIRDWEB_CLIENT_ID,
    thirdwebSecretKey: process.env.THIRDWEB_SECRET_KEY,
    thirdwebVaultAccessToken: process.env.THIRDWEB_VAULT_ACCESS_TOKEN,
    thirdwebTransactionsUrl: process.env.THIRDWEB_TRANSACTIONS_URL ?? "https://engine.thirdweb.com",
    thirdwebEngineUrl: process.env.THIRDWEB_ENGINE_URL,
    thirdwebEngineAccessToken: process.env.THIRDWEB_ENGINE_ACCESS_TOKEN,
    thirdwebBackendWalletAddress: process.env.THIRDWEB_BACKEND_WALLET_ADDRESS,
    chainId: Number(process.env.X_LAYER_CHAIN_ID ?? 1952),
    rpcUrl: process.env.X_LAYER_RPC_URL ?? "https://testrpc.xlayer.tech/terigon",
    deployerAddress: process.env.THIRDWEB_DEPLOYER_ADDRESS,
    genesisContractAddress: process.env.GENESIS_CONTRACT_ADDRESS,
    chapterContractAddress: process.env.CHAPTER_CONTRACT_ADDRESS
  }
} as const;
