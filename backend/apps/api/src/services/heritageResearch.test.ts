import assert from "node:assert/strict";
import test from "node:test";
import { shouldResearch } from "./heritageResearch.js";

test("shouldResearch returns true for short local knowledge", () => {
  assert.equal(shouldResearch({ subject: "Hampi", localKnowledge: "short" }), true);
});

test("shouldResearch returns false when local knowledge is sufficient and not time-sensitive", () => {
  const longKnowledge = "A".repeat(600);
  assert.equal(shouldResearch({ subject: "Hampi", localKnowledge: longKnowledge }), false);
});

test("shouldResearch returns true for time-sensitive queries", () => {
  const longKnowledge = "A".repeat(600);
  assert.equal(shouldResearch({ subject: "Dasara 2026 festival", localKnowledge: longKnowledge }), true);
});

test("shouldResearch returns true for festivals category", () => {
  const longKnowledge = "A".repeat(600);
  assert.equal(shouldResearch({ subject: "Mysore Dasara", category: "festivals", localKnowledge: longKnowledge }), true);
});

test("shouldResearch returns true when forceFresh is true", () => {
  const longKnowledge = "A".repeat(600);
  assert.equal(shouldResearch({ subject: "Hampi", localKnowledge: longKnowledge, forceFresh: true }), true);
});

test("shouldResearch returns true for subjects with current keywords", () => {
  const longKnowledge = "A".repeat(600);
  assert.equal(shouldResearch({ subject: "upcoming events Karnataka", localKnowledge: longKnowledge }), true);
  assert.equal(shouldResearch({ subject: "latest news Hampi", localKnowledge: longKnowledge }), true);
});
