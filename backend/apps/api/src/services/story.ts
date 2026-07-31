import { z } from "zod";
import { AiBlockedError, ProviderRequestError } from "../ai/errors.js";
import { generateStructured } from "../ai/providers.js";
import type { StructuredGenerateOutput, ToolDefinition } from "../ai/types.js";
import type { AiProvider } from "../config.js";
import type { ChapterRow, JsonValue, WorldRow } from "../db/types.js";
import { fetchVisualKnowledge } from "./knowledge.js";

const shortText = (max: number) => z.string().trim().min(1).max(max);
const factsSchema = z.array(shortText(300)).max(6); // Reduced from 12 to 6

const characterSheetSchema = z.object({
  name: shortText(80),
  visualTraits: z.array(shortText(160)).min(2).max(5), // Reduced max limits
  personality: z.array(shortText(120)).min(2).max(4),
  styleKeywords: z.array(shortText(80)).min(2).max(5),
  characterSummary: shortText(300), // Reduced from 500
  growthArc: shortText(300), // Reduced from 500
  backgroundsAndLayouts: shortText(300),
  hardRules: shortText(300)
});

export const genesisOutputSchema = z.object({
  characterSheet: characterSheetSchema,
  portraitPrompt: shortText(800), // Reduced from 1400
  worldFacts: factsSchema,
  openThreads: factsSchema
});

export const chapterOutputSchema = z.object({
  content: z.string().trim().min(900).max(3_800),
  sceneDescription: shortText(900),
  worldFacts: factsSchema,
  openThreads: factsSchema
});

export type GenesisDraft = z.infer<typeof genesisOutputSchema>;
export type ChapterDraft = z.infer<typeof chapterOutputSchema>;

const genesisTool: ToolDefinition = {
  name: "submit_genesis",
  description: "Submit the canonical Genesis world package.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["characterSheet", "portraitPrompt", "worldFacts", "openThreads"],
    properties: {
      characterSheet: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "visualTraits",
          "personality",
          "styleKeywords",
          "characterSummary",
          "growthArc",
          "backgroundsAndLayouts",
          "hardRules"
        ],
        properties: {
          name: { type: "string" },
          visualTraits: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
          personality: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
          styleKeywords: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
          characterSummary: { type: "string" },
          growthArc: { type: "string" },
          backgroundsAndLayouts: { type: "string" },
          hardRules: { type: "string" }
        }
      },
      portraitPrompt: { type: "string" },
      worldFacts: { type: "array", items: { type: "string" }, maxItems: 6 },
      openThreads: { type: "array", items: { type: "string" }, maxItems: 6 }
    }
  }
};

const chapterTool: ToolDefinition = {
  name: "submit_chapter",
  description: "Submit the next canonical Loreloom chapter and its updated story bible.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["content", "sceneDescription", "worldFacts", "openThreads"],
    properties: {
      content: { type: "string" },
      sceneDescription: { type: "string" },
      worldFacts: { type: "array", items: { type: "string" }, maxItems: 12 },
      openThreads: { type: "array", items: { type: "string" }, maxItems: 12 }
    }
  }
};

export async function generateGenesisDraft(input: {
  intake: JsonValue;
  styleLock?: string | null;
  provider?: AiProvider;
}): Promise<{ draft: GenesisDraft; generation: StructuredGenerateOutput; validationAttempt: number }> {
  const userPrompt = typeof input.intake === "object" && input.intake !== null
    ? String((input.intake as any).prompt || (input.intake as any).name || (input.intake as any).premise || "")
    : "";
  const grounding = await fetchVisualKnowledge(userPrompt);

  const prompt = [
    "Transform this raw Loreloom character intake into a locked canon package.",
    `Intake: ${JSON.stringify(input.intake)}`,
    `Requested style lock: ${input.styleLock ?? "none"}`,
    grounding ? `Real-world Lore & Visual Grounding: ${grounding}` : "",
    "",
    "CRITICAL CANON GENERATION DIRECTIVES:",
    "1. You MUST read the user's prompt in the intake carefully and incorporate EVERY detail, theme, setting, character name, memory, and conflict they described.",
    "2. The character name, characterSummary, visualTraits, personality, and growthArc MUST be directly derived from and match the details in the user's prompt.",
    "3. The 'worldFacts' and 'openThreads' MUST be entirely based on the setting and conflict described in the user's prompt. Do NOT invent unrelated generic lore if the user has provided specific world details.",
    "4. The 'growthArc', 'backgroundsAndLayouts', and 'hardRules' MUST be uniquely written based on the user's prompt themes (e.g. if fantasy, do not use sci-fi placeholders).",
    "5. Invent only missing surrounding details needed to form a cohesive, consistent character genesis sheet. Keep all user-supplied identity details completely intact.",
    "",
    "The portraitPrompt must describe one consistent, original, non-branded character portrait using the returned visual traits and style keywords.",
    "worldFacts and openThreads are compact canon, not prose summaries."
  ].join("\n");

  return generateValidated({
    provider: input.provider ?? "openrouter",
    tool: genesisTool,
    schema: genesisOutputSchema,
    systemPrompt:
      "You are Loreloom's Genesis agent. Create durable story canon that makes a character visually and narratively consistent across future chapters.",
    prompt,
    temperature: 0.65
  });
}

export async function generateChapterDraft(
  world: WorldRow,
  chapter: ChapterRow,
  provider?: AiProvider
): Promise<{ draft: ChapterDraft; generation: StructuredGenerateOutput; validationAttempt: number }> {
  const prompt = [
    `Write Loreloom chapter ${chapter.chapter_index} as one complete 400-600 word scene with rich sensory detail and vivid prose.`,
    `Locked character sheet: ${JSON.stringify(world.character_sheet)}`,
    `Style lock: ${world.style_lock ?? "cinematic storybook"}`,
    `Current world facts: ${JSON.stringify(world.world_facts)}`,
    `Open threads: ${JSON.stringify(world.open_threads)}`,
    "Advance at least one open thread while preserving all established canon.",
    "sceneDescription must be a concise illustration brief for the exact dramatic moment in this chapter."
  ].join("\n");

  return generateValidated({
    provider: provider ?? "openrouter",
    tool: chapterTool,
    schema: chapterOutputSchema,
    systemPrompt:
      "You are Loreloom's Story engine. Write vivid, safe, original fiction. STRICT PROSE RULE: Never use hyphens (-) or em-dashes (—) in the story text prose. Write smooth, natural sentences using commas, periods, or conjunctions instead of dashes. Return canon updates through the required tool only; never include past chapter text in the story bible.",
    prompt,
    temperature: 0.75
  });
}

async function generateValidated<T>(input: {
  provider: AiProvider;
  tool: ToolDefinition;
  schema: z.ZodType<T>;
  systemPrompt: string;
  prompt: string;
  temperature: number;
}): Promise<{ draft: T; generation: StructuredGenerateOutput; validationAttempt: number }> {
  let repairContext = "";

  for (let validationAttempt = 1; validationAttempt <= 2; validationAttempt += 1) {
    const generation = await generateStructured({
      provider: input.provider,
      tool: input.tool,
      systemPrompt: input.systemPrompt,
      prompt: `${input.prompt}${repairContext}`,
      temperature: input.temperature,

    });

    if (generation.safety.status !== "passed") {
      throw new AiBlockedError("The model response did not pass the safety checkpoint.", generation.safety);
    }

    const parsed = input.schema.safeParse(generation.arguments);
    if (parsed.success) {
      return { draft: parsed.data, generation, validationAttempt };
    }

    repairContext = `\nYour previous tool arguments failed validation: ${parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "result"}: ${issue.message}`)
      .join("; ")}. Call the same tool again with corrected arguments.`;
  }

  throw new ProviderRequestError(input.provider, "The model returned malformed structured output twice; will retry.", 500);
}
