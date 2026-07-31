import { AiBlockedError, ProviderRequestError, ProviderSetupError } from "@/server/ai/errors";
import { config } from "@/server/config";
import type { ChapterRow, WorldRow } from "@/server/db/types";
import { pinImage } from "@/server/services/ipfs";
import { fetchVisualKnowledge } from "@/server/services/knowledge";

type AspectRatio = "16:9" | "1:1" | "9:16";



export async function generatePortraitUrl(world: WorldRow) {
  const portraitPrompt = portraitPromptFromWorld(world);
  return generateImage({
    prompt: `${portraitPrompt}\nCreate a single polished reference portrait. Preserve these locked style keywords: ${world.style_lock ?? "cinematic storybook"}.`,
    name: `loreloom-${world.id}-portrait.png`
  });
}

export async function generateChapterImageUrl(
  world: WorldRow,
  chapter: ChapterRow,
  aspectRatio: AspectRatio = "1:1",
  overrides?: { styleLock?: string; narrativeContext?: string }
) {
  const styleLock = overrides?.styleLock ?? world.style_lock ?? "cinematic storybook";
  const characterSheet = world.character_sheet;
  let characterHint = "";
  if (characterSheet && typeof characterSheet === "object" && !Array.isArray(characterSheet)) {
    const cs = characterSheet as Record<string, unknown>;
    const bits: string[] = [];
    if (typeof cs.name === "string") bits.push(`Protagonist: ${cs.name}`);
    if (typeof cs.appearance === "string") bits.push(`Appearance: ${cs.appearance}`);
    if (Array.isArray(cs.styleKeywords)) bits.push(`Style: ${(cs.styleKeywords as unknown[]).join(", ")}`);
    characterHint = bits.join(". ");
  }

  const narrativeBeat = overrides?.narrativeContext ?? chapter.scene_description ?? "";
  const grounding = await fetchVisualKnowledge(world.title || narrativeBeat.slice(0, 80));

  const prompt = [
    `Cinematic illustration for this exact Loreloom chapter scene.`,
    `Style lock: ${styleLock}.`,
    grounding ? `Real-world visual anchors: ${grounding}.` : "",
    characterHint ? `Character reference: ${characterHint}.` : "",
    `Scene description: ${narrativeBeat}`.trim(),
    world.reference_image_url ? "Use the supplied reference image to preserve the protagonist's identity, visual traits, and art direction." : "",
    `Do NOT include any text, letters, or UI overlays in the image.`
  ].filter(Boolean).join(" ");

  return generateImage({
    prompt,
    referenceImageUrl: world.reference_image_url || undefined,
    name: `loreloom-${world.id}-chapter-${chapter.chapter_index}.png`,
    aspectRatio
  });
}

function aspectToDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1024, height: 576 };
    case "9:16":
      return { width: 576, height: 1024 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}



async function generatePollinationsImage(input: { prompt: string; name: string; aspectRatio?: AspectRatio }) {
  const dims = aspectToDimensions(input.aspectRatio ?? "1:1");
  const cleanPrompt = encodeURIComponent(input.prompt.slice(0, 400));
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${dims.width}&height=${dims.height}&nologo=true&seed=${seed}`;

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Pollinations AI error: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return pinImage({ bytes: Buffer.from(buffer), mimeType, name: input.name });
}

async function generateImage(input: { prompt: string; referenceImageUrl?: string; name: string; aspectRatio?: AspectRatio }) {
  console.log(`[images] Constructing image generation for prompt: "${input.prompt.slice(0, 100)}..."`);



  // 2. Try Stability AI next
  if (config.stability.apiKey) {
    try {
      console.log("[images] Attempting image generation via Stability API...");
      const url = await generateStabilityImage(input);
      console.log("[images] Stability image generation succeeded:", url);
      return url;
    } catch (err) {
      console.warn("[images] Stability generation failed, falling back...", err);
    }
  }

  // 3. Try Pollinations AI FLUX Engine (Free, instant, unlimited AI image generation matching exact prompt!)
  try {
    console.log("[images] Generating relevant AI artwork via Pollinations FLUX engine...");
    const url = await generatePollinationsImage(input);
    console.log("[images] Pollinations FLUX image generation succeeded:", url);
    return url;
  } catch (err) {
    console.warn("[images] Pollinations generation failed, falling back...", err);
  }

  console.warn("[images] All AI image providers failed. Falling back to placeholder image...");
  return placeholderImage(input.prompt);
}

async function generateStabilityImage(input: { prompt: string; name: string; aspectRatio?: AspectRatio }) {
  if (!config.stability.apiKey) {
    throw new ProviderSetupError("Stability AI", "STABILITY_API_KEY");
  }

  const formData = new FormData();
  formData.append("prompt", input.prompt);
  formData.append("output_format", "jpeg");
  if (input.aspectRatio) {
    formData.append("aspect_ratio", input.aspectRatio);
  } else {
    formData.append("aspect_ratio", "1:1");
  }

  const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.stability.apiKey}`,
      Accept: "image/*"
    },
    body: formData as any
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ProviderRequestError("Stability image", text || response.statusText, response.status);
  }

  const buffer = await response.arrayBuffer();
  return pinImage({ bytes: Buffer.from(buffer), mimeType: "image/jpeg", name: input.name });
}

async function generateNvidiaImage(input: { prompt: string; name: string; aspectRatio?: AspectRatio }) {
  if (!config.nvidia.apiKey) {
    throw new ProviderSetupError("NVIDIA", "NVIDIA_API_KEY");
  }

  const dims = aspectToDimensions(input.aspectRatio ?? "1:1");
  const width = dims.width;
  const height = dims.height;
  const url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.nvidia.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      prompt: input.prompt,
      seed: Math.floor(Math.random() * 2 ** 31),
      width,
      height
    }),
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    artifacts?: Array<{ base64?: string; finishReason?: string }>;
  };

  if (!response.ok) {
    throw new ProviderRequestError("NVIDIA image", data.error ?? response.statusText, response.status);
  }

  const base64 = data.artifacts?.[0]?.base64;
  if (!base64) {
    throw new AiBlockedError("NVIDIA did not return a usable illustration.", { finishReason: data.artifacts?.[0]?.finishReason });
  }

  return pinImage({ bytes: Buffer.from(base64, "base64"), mimeType: "image/jpeg", name: input.name });
}



function placeholderImage(prompt: string) {
  const defaultPortraits = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=600&auto=format&fit=crop"
  ];
  const index = Math.abs(prompt.length) % defaultPortraits.length;
  return defaultPortraits[index];
}

async function fetchReferenceImage(imageUrl: string) {
  const source = imageUrl.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${imageUrl.slice("ipfs://".length)}`
    : imageUrl;
  const response = await fetch(source);
  if (!response.ok) {
    throw new AiBlockedError("The reference portrait could not be loaded for identity-preserving illustration.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "image/png";
  return { mimeType, data: Buffer.from(bytes).toString("base64") };
}

function portraitPromptFromWorld(world: WorldRow) {
  let cs: any = world.character_sheet;
  if (typeof cs === "string" && cs.trim()) {
    try {
      cs = JSON.parse(cs);
    } catch (e) {
      cs = null;
    }
  }

  if (typeof cs === "object" && cs !== null && !Array.isArray(cs)) {
    const prompt = cs.portraitPrompt;
    if (typeof prompt === "string" && prompt.trim()) {
      return prompt;
    }
    
    // Robust fallback if portraitPrompt is missing
    const name = typeof cs.name === "string" ? cs.name : "the protagonist";
    const desc = typeof cs.appearance === "string" 
      ? cs.appearance 
      : (typeof cs.characterSummary === "string" ? cs.characterSummary : "mysterious hero");
    const style = world.style_lock ? `In the style of ${world.style_lock}` : "";
    return `A high-quality cinematic reference portrait of ${name}, ${desc}. ${style}`.trim();
  }

  // Final fallback if character_sheet is completely missing or unparseable
  const title = world.title || "mysterious protagonist";
  const style = world.style_lock ? `In the style of ${world.style_lock}` : "";
  return `A high-quality cinematic reference portrait of ${title}. ${style}`.trim();
}
