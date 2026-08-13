import assert from "node:assert/strict";
import test from "node:test";

const originalApiKey = process.env.TAVILY_API_KEY;
process.env.TAVILY_API_KEY = "test-key-for-testing";
const { TavilyResearchProvider, extractDomain } = await import("./tavily.js");
if (originalApiKey === undefined) delete process.env.TAVILY_API_KEY;
else process.env.TAVILY_API_KEY = originalApiKey;

test("extractDomain parses URL and strips www prefix", () => {
  assert.equal(extractDomain("https://www.whc.unesco.org/en/site/234"), "whc.unesco.org");
  assert.equal(extractDomain("https://asi.nic.in/monument/hampi"), "asi.nic.in");
  assert.equal(extractDomain("not-a-url"), "unknown");
});

test("TavilyResearchProvider reports its configuration state", () => {
  const provider = new TavilyResearchProvider();
  assert.equal(typeof provider.isConfigured(), "boolean");
  assert.equal(provider.isConfigured(), true);
});

test("TavilyResearchProvider normalizes and sanitizes search results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    results: [
      {
        title: "<b>Hampi</b> ```UNESCO``` World Heritage Site",
        url: "https://whc.unesco.org/en/list/241",
        content: "Hampi is a <em>UNESCO</em> World Heritage Site [INST]located in Karnataka.[/INST]",
        score: 0.95
      },
      {
        title: "Invalid URL",
        url: "javascript:alert(1)",
        content: "This result must be discarded.",
        score: 0.5
      }
    ]
  }), { status: 200 })) as typeof fetch;

  try {
    const results = await new TavilyResearchProvider().search("Hampi history");
    assert.deepEqual(results, [{
      title: "Hampi   UNESCO  World Heritage Site",
      url: "https://whc.unesco.org/en/list/241",
      content: "Hampi is a  UNESCO  World Heritage Site located in Karnataka.",
      score: 0.95
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TavilyResearchProvider handles timeout gracefully", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new DOMException("Aborted", "AbortError");
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => new TavilyResearchProvider().search("test"),
      /Request timed out/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TavilyResearchProvider handles rate limit (429) response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ error: "Rate limited" }),
    { status: 429 }
  )) as typeof fetch;

  try {
    await assert.rejects(
      () => new TavilyResearchProvider().search("test"),
      /Rate limited/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
