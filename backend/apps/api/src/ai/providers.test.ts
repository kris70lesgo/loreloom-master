import assert from "node:assert/strict";
import test from "node:test";
import { generateStructured } from "./providers.js";

test("uses OpenRouter once when Gemini has a transient provider failure", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    calls.push(url);

    if (url.includes("generativelanguage.googleapis.com")) {
      return new Response(JSON.stringify({ error: { message: "temporarily unavailable" } }), { status: 503 });
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              tool_calls: [
                { function: { name: "submit_test", arguments: '{"value":"fallback"}' } }
              ]
            }
          }
        ]
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    const result = await generateStructured({
      provider: "gemini",
      systemPrompt: "Return the tool result.",
      prompt: "Test.",
      tool: {
        name: "submit_test",
        description: "Submit a test result.",
        parameters: {
          type: "object",
          required: ["value"],
          properties: { value: { type: "string" } }
        }
      },
      allowNvidiaFallback: true
    });

    assert.equal(result.provider, "openrouter");
    assert.deepEqual(result.arguments, { value: "fallback" });
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
