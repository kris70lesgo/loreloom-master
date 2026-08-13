import assert from "node:assert/strict";
import test from "node:test";
import { claimTypeSchema, researchEvidenceSchema, sourceSchema } from "./research.js";

test("claimTypeSchema accepts all supported claim types", () => {
  const validTypes = [
    "VERIFIED_HISTORY", "ARCHAEOLOGICAL_RECORD", "CULTURAL_TRADITION",
    "FOLKLORE", "LEGEND", "MYTHOLOGY", "COMMUNITY_ACCOUNT",
    "CURRENT_INFORMATION", "CREATIVE_INTERPRETATION"
  ];
  for (const type of validTypes) {
    assert.equal(claimTypeSchema.safeParse(type).success, true, `Failed for ${type}`);
  }
});

test("claimTypeSchema rejects unknown types", () => {
  assert.equal(claimTypeSchema.safeParse("HISTORY").success, false);
  assert.equal(claimTypeSchema.safeParse("fact").success, false);
});

test("sourceSchema validates a well-formed source", () => {
  const result = sourceSchema.safeParse({
    title: "Hampi UNESCO",
    url: "https://whc.unesco.org/en/list/241",
    domain: "whc.unesco.org"
  });
  assert.equal(result.success, true);
});

test("sourceSchema rejects invalid URLs", () => {
  const result = sourceSchema.safeParse({ title: "Bad", url: "not-a-url", domain: "bad" });
  assert.equal(result.success, false);
});

test("researchEvidenceSchema validates complete evidence", () => {
  const result = researchEvidenceSchema.safeParse({
    subject: "Hampi",
    claims: [{
      claim: "Hampi was the capital of the Vijayanagara Empire.",
      type: "VERIFIED_HISTORY",
      confidence: 0.95,
      source: {
        title: "UNESCO",
        url: "https://whc.unesco.org/en/list/241",
        domain: "whc.unesco.org"
      }
    }],
    sources: [{
      title: "UNESCO",
      url: "https://whc.unesco.org/en/list/241",
      domain: "whc.unesco.org"
    }]
  });
  assert.equal(result.success, true);
});

test("researchEvidenceSchema rejects evidence with too many claims", () => {
  const claims = Array.from({ length: 31 }, (_, i) => ({
    claim: `Claim ${i} with sufficient length`,
    type: "VERIFIED_HISTORY",
    confidence: 0.9,
    source: { title: "S", url: "https://example.com", domain: "example.com" }
  }));
  const result = researchEvidenceSchema.safeParse({ subject: "Test", claims, sources: [] });
  assert.equal(result.success, false);
});
