import type { NextConfig } from "next";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

const envRoots = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env")
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

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
