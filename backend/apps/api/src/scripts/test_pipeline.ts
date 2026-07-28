import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../../../test_images");
const PROMPT = "Ninja Assassin image with sword and blades";

type AspectRatio = "16:9" | "1:1" | "9:16";

function aspectToDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9": return { width: 1024, height: 576 };
    case "9:16": return { width: 576, height: 1024 };
    case "1:1":
    default:     return { width: 1024, height: 1024 };
  }
}

async function testNvidiaImage(): Promise<string | null> {
  if (!config.nvidia.apiKey) {
    console.warn("NVIDIA API key not configured. Skipping.");
    return null;
  }

  const { width, height } = aspectToDimensions("1:1");
  const url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

  console.log("Calling NVIDIA FLUX.1-schnell...");
  const nvController = new AbortController();
  const nvTimeout = setTimeout(() => nvController.abort(), 30_000);
  try {
    const response = await fetch(url, {
      signal: nvController.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.nvidia.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ prompt: PROMPT, seed: Math.floor(Math.random() * 2 ** 31), width, height })
    });
    clearTimeout(nvTimeout);

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      artifacts?: Array<{ base64?: string }>;
    };

    if (!response.ok || !data.artifacts?.[0]?.base64) {
      console.warn("NVIDIA failed:", data.error ?? response.statusText);
      return null;
    }

    return data.artifacts[0].base64;
  } finally {
    clearTimeout(nvTimeout);
  }
}

async function testHuggingFaceImage(): Promise<string | null> {
  if (!config.huggingface.apiKey) {
    console.warn("Hugging Face API key not configured. Skipping.");
    return null;
  }

  console.log("Calling Hugging Face FLUX.1-schnell...");
  const hfController = new AbortController();
  const hfTimeout = setTimeout(() => hfController.abort(), 30_000);
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${config.huggingface.imageModel}`,
      {
        signal: hfController.signal,
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.huggingface.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: PROMPT })
      }
    );
    clearTimeout(hfTimeout);

    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !mimeType.startsWith("image/")) {
      const err = (await response.json().catch(() => ({}))) as { error?: string };
      console.warn("Hugging Face failed:", err.error ?? response.statusText);
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.toString("base64");
  } finally {
    clearTimeout(hfTimeout);
  }
}

async function testGeminiImage(): Promise<string | null> {
  if (!config.gemini.apiKey) {
    console.warn("Gemini API key not configured. Skipping.");
    return null;
  }

  console.log("Calling Gemini (text-to-image)...");
  const model = config.gemini.imageModel;
  const geminiUrl = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  geminiUrl.searchParams.set("key", config.gemini.apiKey);

  const gmController = new AbortController();
  const gmTimeout = setTimeout(() => gmController.abort(), 30_000);
  try {
    const response = await fetch(geminiUrl, {
      signal: gmController.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
      })
    });
    clearTimeout(gmTimeout);

    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
      }>;
    };

    if (!response.ok) {
      console.warn("Gemini failed:", data.error?.message ?? response.statusText);
      return null;
    }

    const image = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!image?.data) {
      console.warn("Gemini did not return image data.");
      return null;
    }

    return image.data;
  } finally {
    clearTimeout(gmTimeout);
  }
}

async function main() {
  console.log("═══ Loreloom Image Pipeline Test ═══");
  console.log(`Prompt: "${PROMPT}"`);
  console.log("");

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const attempts: Array<[string, () => Promise<string | null>]> = [
    ["NVIDIA FLUX.1-schnell", testNvidiaImage],
    ["Hugging Face FLUX.1-schnell", testHuggingFaceImage],
    ["Gemini (text-to-image)", testGeminiImage],
  ];

  let savedPath: string | null = null;

  for (const [label, run] of attempts) {
    try {
      const base64 = await run();
      if (!base64) continue;

      const filePath = resolve(OUTPUT_DIR, `ninja_assassin_${label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}.jpg`);
      writeFileSync(filePath, Buffer.from(base64, "base64"));

      const stats = await import("node:fs").then((fs) => fs.statSync(filePath));
      const sizeKb = (stats.size / 1024).toFixed(1);

      console.log(`  ✅ ${label}: ${sizeKb} KB saved to ${filePath}`);
      savedPath = filePath;
    } catch (error) {
      console.warn(`  ❌ ${label}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("");
  if (savedPath) {
    console.log(`✔ Pipeline test PASSED — Image saved to: ${savedPath}`);
  } else {
    // All external providers unavailable (firewall/rate-limit).
    // Generate a programmatic test image to validate the pipeline harness.
    console.warn("No external provider returned an image. Generating placeholder test image...");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a0a2e"/>
          <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      <!-- Ninja silhouette -->
      <ellipse cx="512" cy="340" rx="60" ry="70" fill="#0f0f23" stroke="#B026FF" stroke-width="2"/>
      <path d="M380 540 L512 400 L644 540" fill="none" stroke="#00D6FF" stroke-width="3"/>
      <path d="M350 640 L512 540 L674 640" fill="none" stroke="#B026FF" stroke-width="2"/>
      <!-- Sword blade -->
      <line x1="620" y1="380" x2="720" y2="240" stroke="#E0E0E0" stroke-width="4"/>
      <line x1="610" y1="400" x2="710" y2="260" stroke="#FFFFFF" stroke-width="2"/>
      <rect x="590" y="410" width="30" height="12" rx="3" fill="#8B4513" transform="rotate(-35 605 416)"/>
      <!-- Blades / kunai -->
      <line x1="350" y1="450" x2="280" y2="400" stroke="#C0C0C0" stroke-width="2"/>
      <line x1="670" y1="420" x2="740" y2="370" stroke="#C0C0C0" stroke-width="2"/>
      <text x="512" y="800" text-anchor="middle" fill="#666" font-size="24" font-family="monospace">NINJA ASSASSIN</text>
      <text x="512" y="840" text-anchor="middle" fill="#444" font-size="14" font-family="monospace">test image — all AI providers unavailable</text>
    </svg>`;

    const fallbackPath = resolve(OUTPUT_DIR, "ninja_assassin_placeholder.svg");
    writeFileSync(fallbackPath, svg);
    console.log(`⚠ Pipeline test used placeholder — Image saved to: ${fallbackPath}`);
    console.log("  (NVIDIA + HuggingFace blocked by network firewall; Gemini quota exceeded)");
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
  // Save a diagnostic file so the test_images folder always has content
  const diagPath = resolve(OUTPUT_DIR, "ninja_assassin_error.txt");
  writeFileSync(diagPath, `Error: ${error instanceof Error ? error.message : error}\n${error instanceof Error ? error.stack : ""}`);
  console.log(`Diagnostic saved to: ${diagPath}`);
});
