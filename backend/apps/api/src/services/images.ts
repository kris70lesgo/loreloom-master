import { AiBlockedError, ProviderRequestError, ProviderSetupError } from "../ai/errors.js";
import { config } from "../config.js";
import type { ChapterRow, WorldRow } from "../db/types.js";
import { pinImage } from "./ipfs.js";
import { fetchVisualKnowledge } from "./knowledge.js";

type AspectRatio = "16:9" | "1:1" | "9:16";

type GeminiImageResponse = {
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
  candidates?: Array<{
    finishReason?: string;
    safetyRatings?: Array<{ blocked?: boolean; category?: string }>;
    content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
  }>;
  error?: { message?: string };
};

export async function generatePortraitUrl(world: WorldRow) {
  const portraitPrompt = portraitPromptFromWorld(world);
  const grounding = await fetchVisualKnowledge(world.title || world.style_lock || "");
  return generateImage({
    prompt: `${portraitPrompt}\n${grounding ? `Visual grounding: ${grounding}\n` : ""}Create a single polished reference portrait. Preserve these locked style keywords: ${world.style_lock ?? "cinematic storybook"}.`,
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

async function generateGeminiImage(input: { prompt: string; referenceImageUrl?: string; name: string }, retryNoImage = false) {
  if (!config.gemini.apiKey) {
    throw new ProviderSetupError("Gemini", "GEMINI_API_KEY");
  }

  const model = config.gemini.imageModel;
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  url.searchParams.set("key", config.gemini.apiKey);

  const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
  if (input.referenceImageUrl && !retryNoImage) {
    const referencePart = await fetchReferenceImage(input.referenceImageUrl);
    parts.push({ inlineData: referencePart });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
    })
  });
  const data = (await response.json().catch(() => ({}))) as GeminiImageResponse;

  if (!response.ok) {
    const geminiMsg = data.error?.message ?? "";
    if (geminiMsg.includes("does not support image input") || geminiMsg.includes("not supported")) {
      if (input.referenceImageUrl && !retryNoImage) {
        console.warn(`[images] Gemini model "${model}" does not support image input — retrying without reference image.`);
        return generateGeminiImage({ ...input, referenceImageUrl: undefined }, true);
      }
      console.warn(`[images] Gemini model "${model}" does not support image input.`);
    }
    throw new ProviderRequestError("Gemini image", geminiMsg || response.statusText, response.status);
  }

  const candidate = data.candidates?.[0];
  const blocked = data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY" || candidate?.safetyRatings?.find((item) => item.blocked);
  if (blocked) {
    throw new AiBlockedError("Gemini blocked this illustration.", {
      reason: data.promptFeedback?.blockReasonMessage ?? data.promptFeedback?.blockReason,
      finishReason: candidate?.finishReason
    });
  }

  const image = candidate?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
  if (!image?.data || !image.mimeType) {
    throw new AiBlockedError("Gemini did not return a usable illustration.", { finishReason: candidate?.finishReason });
  }

  return pinImage({ bytes: Buffer.from(image.data, "base64"), mimeType: image.mimeType, name: input.name });
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

  // 1. Try Gemini first (if configured and valid)
  if (config.gemini.apiKey) {
    try {
      console.log("[images] Attempting image generation via Gemini API...");
      const url = await generateGeminiImage(input);
      console.log("[images] Gemini image generation succeeded:", url);
      return url;
    } catch (err) {
      console.warn("[images] Gemini generation failed, falling back...", err);
    }
  }

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

async function generateHuggingFaceImage(input: { prompt: string; name: string }) {
  if (!config.huggingface.apiKey) {
    throw new ProviderSetupError("Hugging Face", "HUGGINGFACE_API_KEY");
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${config.huggingface.imageModel}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingface.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: input.prompt })
    }
  );

  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!response.ok || !mimeType.startsWith("image/")) {
    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ProviderRequestError(
      "Hugging Face image",
      data.error ?? data.message ?? response.statusText,
      response.status
    );
  }

  return pinImage({ bytes: new Uint8Array(await response.arrayBuffer()), mimeType, name: input.name });
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
  if (typeof world.character_sheet === "object" && world.character_sheet !== null && !Array.isArray(world.character_sheet)) {
    const prompt = (world.character_sheet as Record<string, unknown>).portraitPrompt;
    if (typeof prompt === "string" && prompt.trim()) {
      return prompt;
    }
  }

  throw new AiBlockedError("The Genesis agent did not produce a locked portrait prompt.");
}
