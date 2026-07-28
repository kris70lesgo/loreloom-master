import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../config.js";
import { normalizeEngineTransaction } from "./thirdwebEngine.js";

test("normalizes an Engine mined transaction", () => {
  assert.deepEqual(
    normalizeEngineTransaction({ status: "mined", transactionHash: "0xabc" }),
    { status: "mined", transactionHash: "0xabc", errorMessage: undefined }
  );
});

test("normalizes JSON-encoded Engine status payloads", () => {
  assert.deepEqual(
    normalizeEngineTransaction('{"status":"errored","errorMessage":"insufficient OKB"}'),
    { status: "errored", transactionHash: undefined, errorMessage: "insufficient OKB" }
  );
});

test("keeps unknown Engine states non-confirmable", () => {
  assert.equal(normalizeEngineTransaction({ status: "pending" }).status, "unknown");
});

test("normalizes Transactions v3 confirmed and failed states", () => {
  assert.deepEqual(
    normalizeEngineTransaction({ status: "CONFIRMED", transactionHash: "0xdef" }),
    { status: "mined", transactionHash: "0xdef", errorMessage: undefined }
  );
  assert.deepEqual(
    normalizeEngineTransaction({ status: "FAILED", errorMessage: "missing role" }),
    { status: "errored", transactionHash: undefined, errorMessage: "missing role" }
  );
});

test("submits Transactions v3 contract writes with EOA execution", async () => {
  const originalMintConfig = { ...config.mint };
  Object.assign(config.mint, {
    mode: "thirdweb-transactions",
    thirdwebSecretKey: "test-secret",
    thirdwebVaultAccessToken: undefined,
    thirdwebBackendWalletAddress: "0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467",
    chainId: 1952
  });

  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  let requestHeaders: Headers | undefined;
  let requestUrl = "";

  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ result: { transactions: [{ id: "tx-id-1", batchIndex: 0 }] } }),
      { status: 202 }
    );
  }) as typeof fetch;

  try {
    const { submitContractWrite } = await import(`./thirdwebEngine.js?test=${Date.now()}`);
    const result = await submitContractWrite({
      contractAddress: "0x1111111111111111111111111111111111111111",
      functionName: "mint",
      args: ["0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467", "ipfs://metadata"],
      idempotencyKey: "genesis-test"
    });

    assert.equal(result.queueId, "tx-id-1");
    assert.equal(requestUrl, "https://engine.thirdweb.com/v1/write/contract");
    assert.equal(requestHeaders?.get("x-secret-key"), "test-secret");
    assert.equal(requestHeaders?.has("x-vault-access-token"), false);
    assert.deepEqual(requestBody?.executionOptions, {
      type: "EOA",
      chainId: 1952,
      from: "0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467",
      idempotencyKey: "genesis-test"
    });
    assert.deepEqual(requestBody?.params, [
      {
        contractAddress: "0x1111111111111111111111111111111111111111",
        method: "mint(address,string)",
        params: ["0xa33Ebc28fF3b0135ba2DaC18990DDDc162Dc2467", "ipfs://metadata"]
      }
    ]);
  } finally {
    Object.assign(config.mint, originalMintConfig);
    globalThis.fetch = originalFetch;
  }
});
