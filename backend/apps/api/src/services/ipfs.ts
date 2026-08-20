import { createHash } from "node:crypto";
import { config } from "../config.js";
import type { JsonValue } from "../db/types.js";

export async function pinJson(metadata: JsonValue) {
  if (config.ipfs.mode === "mock") {
    return mockJsonUri(metadata);
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
    console.warn("[ipfs] Pinata metadata upload failed; using mock metadata URI.", {
      status: response.status,
      error: formatPinataError(data.error)
    });
    return mockJsonUri(metadata);
  }

  return `ipfs://${data.IpfsHash}`;
}

export async function pinImage(input: { bytes: Uint8Array; mimeType: string; name: string }) {
  if (config.ipfs.mode === "mock") {
    return imageDataUri(input);
  }

  if (config.ipfs.mode !== "pinata" || !config.ipfs.pinataJwt) {
    return imageDataUri(input);
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
    console.warn("[ipfs] Pinata image upload failed; using data URI fallback.", {
      status: response.status,
      error: formatPinataError(data.error)
    });
    return imageDataUri(input);
  }

  return `ipfs://${data.IpfsHash}`;
}

function imageDataUri(input: { bytes: Uint8Array; mimeType: string }) {
  const base64 = Buffer.from(input.bytes).toString("base64");
  return `data:${input.mimeType};base64,${base64}`;
}

function mockJsonUri(metadata: JsonValue) {
  const hash = createHash("sha256").update(JSON.stringify(metadata)).digest("hex").slice(0, 46);
  return `ipfs://mock/metadata/${hash}`;
}

function formatPinataError(error: unknown) {
  if (!error) return "Pinata could not store the generated image.";
  return typeof error === "string" ? error : JSON.stringify(error);
}
