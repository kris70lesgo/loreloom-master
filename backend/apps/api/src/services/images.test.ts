import assert from "node:assert/strict";
import test from "node:test";
import type { ChapterRow, WorldRow } from "../db/types.js";

test("chapter art generates from narrative even without a reference portrait", async () => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-gemini-key";
  process.env.NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "test-nvidia-key";
  process.env.IPFS_MODE = "mock";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.includes("generativelanguage.googleapis.com")) {
      return new Response(JSON.stringify({ error: { message: "temporarily unavailable" } }), { status: 503 });
    }

    if (url.includes("api.stability.ai")) {
      return new Response("temporarily unavailable", { status: 503 });
    }

    if (url.includes("ai.api.nvidia.com")) {
      return new Response(
        JSON.stringify({
          artifacts: [{ base64: Buffer.from("fake image").toString("base64"), finishReason: "SUCCESS" }]
        }),
        { status: 200 }
      );
    }

    if (url.includes("duckduckgo.com")) {
      return new Response(JSON.stringify({ AbstractText: "Test visual knowledge" }), { status: 200 });
    }

    if (url.includes("pollinations.ai")) {
      return new Response(Buffer.from("fake image"), { status: 200, headers: { "content-type": "image/jpeg" } });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;

  const world = { id: "world-1", reference_image_url: null, style_lock: "cinematic storybook" } as WorldRow;
  const chapter = { chapter_index: 1, scene_description: "A charged confrontation." } as ChapterRow;

  try {
    const { generateChapterImageUrl } = await import("./images.js");

    // The pipeline must not throw when no reference portrait exists — it should
    // fall back to a text-to-image provider.
    const result = await generateChapterImageUrl(world, chapter);
    assert.equal(typeof result, "string");
    assert.ok(result.startsWith("data:image/jpeg;base64,"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
