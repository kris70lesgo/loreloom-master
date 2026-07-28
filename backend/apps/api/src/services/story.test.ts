import assert from "node:assert/strict";
import test from "node:test";
import { chapterOutputSchema, genesisOutputSchema } from "./story.js";

test("Genesis schema accepts a locked character package", () => {
  const result = genesisOutputSchema.safeParse({
    characterSheet: {
      name: "Elara Venn",
      visualTraits: ["amber eyes", "silver-threaded cloak", "crescent scar"],
      personality: ["resolute", "curious", "compassionate"],
      styleKeywords: ["painterly", "cinematic", "fantasy"],
      characterSummary: "A determined cartographer searching for a vanished city.",
      growthArc: "Elara learns to trust others as she uncovers the truth of the city's disappearance.",
      backgroundsAndLayouts: "Misty glasswood forests, crumbling ancient spires, star-chart lined study rooms.",
      hardRules: "No time travel. The city is not destroyed — it is hidden between dimensions."
    },
    portraitPrompt: "A cinematic painterly fantasy portrait of Elara Venn with amber eyes and a silver-threaded cloak.",
    worldFacts: ["Elara maps the shifting Glasswood."],
    openThreads: ["The vanished city has begun to appear in her maps."]
  });

  assert.equal(result.success, true);
});

test("Chapter schema rejects malformed and undersized results", () => {
  const result = chapterOutputSchema.safeParse({
    content: "Too short.",
    sceneDescription: "A scene.",
    worldFacts: [],
    openThreads: []
  });

  assert.equal(result.success, false);
});
