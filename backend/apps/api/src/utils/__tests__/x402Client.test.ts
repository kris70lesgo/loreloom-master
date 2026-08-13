import test from "node:test";
import assert from "node:assert/strict";
import type { PaymentRequirements } from "../x402Client.js";

test("fetchWithx402 verifies, settles, and retries after a 402 response", async () => {
  process.env.USE_LIVE_NETWORK = "false";
  const { fetchWithx402 } = await import("../x402Client.js");
  const originalFetch = global.fetch;
  const originalLog = console.log;
  const originalWarn = console.warn;

  const requirements: PaymentRequirements = {
    amount: 10,
    asset: "HBAR",
    payTo: "0.0.456",
    network: "hedera:testnet"
  };

  let callCount = 0;
  console.log = () => {};
  console.warn = () => {};

  global.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    callCount += 1;
    const target = String(url);

    if (callCount === 1) {
      return Response.json({ paymentRequirements: requirements }, { status: 402 });
    }

    if (callCount === 2) {
      assert.match(target, /\/verify$/);
      return new Response("OK", { status: 200 });
    }

    if (callCount === 3) {
      assert.match(target, /\/settle$/);
      return Response.json({ success: true, transactionId: "0.0.456@1234.5678" });
    }

    if (callCount === 4) {
      assert.equal(target, "https://api.example.com/data");
      assert.equal((options?.headers as Record<string, string>)?.["X-Payment-Receipt"], "0.0.456@1234.5678");
      return Response.json({ success: true, data: "success" });
    }

    throw new Error(`Unexpected fetch call ${callCount}: ${target}`);
  }) as typeof fetch;

  try {
    const res = await fetchWithx402("https://api.example.com/data", { headers: { "X-Original": "Header" } });
    const data = await res.json();

    assert.equal(callCount, 4);
    assert.equal(data.success, true);
    assert.equal(res.headers.get("X-Payment-Receipt"), "0.0.456@1234.5678");
  } finally {
    global.fetch = originalFetch;
    console.log = originalLog;
    console.warn = originalWarn;
  }
});
