import { createHash } from "node:crypto";
import { config } from "../config.js";
import type { JsonValue } from "../db/types.js";

export async function pinJson(metadata: JsonValue) {
  if (config.ipfs.mode === "mock") {
    const hash = createHash("sha256").update(JSON.stringify(metadata)).digest("hex").slice(0, 46);
    return `ipfs://mock/metadata/${hash}`;
  }

  if (config.ipfs.mode !== "pinata" || !config.ipfs.pinataJwt) {
    throw new Error("Pinata is not configured. Set IPFS_MODE=pinata and add PINATA_JWT.");
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.ipfs.pinataJwt}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pinataContent: metadata })
  });
  const data = (await response.json().catch(() => ({}))) as { IpfsHash?: string; error?: string };
  if (!response.ok || !data.IpfsHash) {
    throw new Error(data.error ?? "Pinata could not store NFT metadata.");
  }

  return `ipfs://${data.IpfsHash}`;
}

export async function pinImage(input: { bytes: Uint8Array; mimeType: string; name: string }) {
  if (config.ipfs.mode === "mock") {
    const base64 = Buffer.from(input.bytes).toString("base64");
    return `data:${input.mimeType};base64,${base64}`;
  }

  if (config.ipfs.mode !== "pinata" || !config.ipfs.pinataJwt) {
    // Fall back to instant data URI if Pinata is not set up
    const base64 = Buffer.from(input.bytes).toString("base64");
    return `data:${input.mimeType};base64,${base64}`;
  }

  const form = new FormData();
  const bytes = input.bytes.buffer.slice(
    input.bytes.byteOffset,
    input.bytes.byteOffset + input.bytes.byteLength
  ) as ArrayBuffer;
  form.append("file", new Blob([bytes], { type: input.mimeType }), input.name);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.ipfs.pinataJwt}` },
    body: form
  });
  const data = (await response.json().catch(() => ({}))) as { IpfsHash?: string; error?: string };

  if (!response.ok || !data.IpfsHash) {
    throw new Error(data.error ?? "Pinata could not store the generated image.");
  }

  return `ipfs://${data.IpfsHash}`;
}
