import { z } from "zod";
import { AiBlockedError, ProviderRequestError } from "../ai/errors.js";
import { generateStructured } from "../ai/providers.js";
import type { StructuredGenerateOutput, ToolDefinition } from "../ai/types.js";
import type { ResearchEvidence } from "../ai/research.js";
import type { AiProvider } from "../config.js";
import type { ChapterRow, JsonValue, WorldRow } from "../db/types.js";
import { researchHeritageSubject, type HeritageResearchInput } from "./heritageResearch.js";

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
  description: "Submit the structured cultural heritage experience package.",
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
  description: "Submit the next heritage experience chapter and its updated cultural canon.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["content", "sceneDescription", "worldFacts", "openThreads"],
    properties: {
      content: { type: "string" },
      sceneDescription: { type: "string" },
      worldFacts: { type: "array", items: { type: "string" }, maxItems: 6 },
      openThreads: { type: "array", items: { type: "string" }, maxItems: 6 }
    }
  }
};

export async function generateGenesisDraft(input: {
  intake: JsonValue;
  styleLock?: string | null;
  provider?: AiProvider;
}): Promise<{ draft: GenesisDraft; generation: StructuredGenerateOutput; validationAttempt: number; research?: ResearchEvidence }> {
  const totalStartedAt = Date.now();
  // Extract heritage subject from intake
  const userPrompt = typeof input.intake === "object" && input.intake !== null
    ? String((input.intake as any).prompt || (input.intake as any).name || (input.intake as any).premise || "")
    : "";

  // Perform heritage research via Tavily
  let researchEvidence: ResearchEvidence | null = null;
  try {
    const researchStartedAt = Date.now();
    const researchInput: HeritageResearchInput = {
      subject: userPrompt,
      category: typeof input.intake === "object" && input.intake !== null
        ? String((input.intake as any).heritageCategory || undefined)
        : undefined
    };
    researchEvidence = await researchHeritageSubject(researchInput);
    console.log(`[story] Genesis research completed in ${Date.now() - researchStartedAt}ms`);
  } catch (err) {
    console.warn("[story] Heritage research failed, continuing without:", err);
  }

  // Build research context from evidence
  const researchContext = researchEvidence
    ? formatResearchForPrompt(researchEvidence)
    : "";

  const prompt = [
    "Transform this Karnataka heritage subject into a structured cultural experience package.",
    `Intake: ${JSON.stringify(input.intake)}`,
    `Requested style lock: ${input.styleLock ?? "none"}`,
    researchContext ? `Heritage Research Evidence (from web sources):\n${researchContext}` : "",
    "",
    "CRITICAL CULTURAL EXPERIENCE GENERATION DIRECTIVES:",
    "1. You MUST read the user's heritage subject in the intake carefully and incorporate EVERY cultural detail, historical fact, location, and tradition they described.",
    "2. The characterSheet should represent the heritage subject, such as a historical figure, a monument, a festival, or an artisan tradition, including its name, visual traits, and cultural significance.",
    "3. The worldFacts should be historically accurate facts about the heritage subject.",
    "4. The openThreads should be interesting aspects to explore further, including mysteries, untold stories, and cultural significance.",
    "5. Respect the cultural and religious significance of the subject. Do not trivialize or misrepresent traditions.",
    "6. Where possible, distinguish between verified historical facts, folklore, legends, and creative interpretations in the worldFacts.",
    "7. Use the Heritage Research Evidence above as primary context. Prioritize claims from authoritative sources (UNESCO, ASI, government). Mark folklore and legends distinctly from verified history in the worldFacts.",
    "",
    "The portraitPrompt must describe a historically inspired, culturally authentic illustration of the heritage subject. Use period-appropriate details, architectural elements, traditional attire, and cultural motifs. Avoid anachronisms.",
    "worldFacts and openThreads are compact canon, not prose summaries."
  ].join("\n");

  const aiStartedAt = Date.now();
  const result = await generateValidated({
    provider: input.provider ?? "groq",
    tool: genesisTool,
    schema: genesisOutputSchema,
    systemPrompt:
      "You are Loreloom's Heritage Research Agent. You transform Karnataka's cultural heritage — monuments, folklore, festivals, artisan traditions, and historical events — into immersive, educational experiences. You preserve cultural authenticity while making heritage accessible and engaging for modern audiences. You always distinguish between verified history, folklore, legend, and creative interpretation.",
    prompt,
    temperature: 0.65
  });
  console.log(`[story] Genesis AI generation completed in ${Date.now() - aiStartedAt}ms`);
  console.log(`[story] Genesis draft total completed in ${Date.now() - totalStartedAt}ms`);

  return { ...result, research: researchEvidence ?? undefined };
}

export async function generateChapterDraft(
  world: WorldRow,
  chapter: ChapterRow,
  provider?: AiProvider
): Promise<{ draft: ChapterDraft; generation: StructuredGenerateOutput; validationAttempt: number; research?: ResearchEvidence }> {
  // Research additional context for the chapter
  const worldTitle = typeof world.title === "string" ? world.title : "";
  let researchEvidence: ResearchEvidence | null = null;
  try {
    if (worldTitle) {
      researchEvidence = await researchHeritageSubject({
        subject: worldTitle,
        forceFresh: false
      });
    }
  } catch (err) {
    console.warn("[story] Chapter heritage research failed, continuing without:", err);
  }

  const researchContext = researchEvidence
    ? formatResearchForPrompt(researchEvidence)
    : "";

  const prompt = [
    `Write Loreloom chapter ${chapter.chapter_index} as one complete 400-600 word immersive cultural experience about this Karnataka heritage subject.`,
    `Locked character sheet: ${JSON.stringify(world.character_sheet)}`,
    `Style lock: ${world.style_lock ?? "cinematic storybook"}`,
    `Current world facts: ${JSON.stringify(world.world_facts)}`,
    `Open threads: ${JSON.stringify(world.open_threads)}`,
    researchContext ? `Heritage Research Evidence:\n${researchContext}` : "",
    "Use the research evidence to enrich the cultural and historical accuracy of this chapter. Cite facts from authoritative sources; clearly separate folklore from documented history.",
    "Advance at least one open thread while preserving all established cultural canon. Include vivid sensory details of the setting — architecture, landscape, sounds, aromas, and cultural atmosphere.",
    "sceneDescription must be a concise illustration brief depicting the cultural moment in this chapter, including period-appropriate architecture, attire, and cultural elements."
  ].join("\n");

  const result = await generateValidated({
    provider: provider ?? "groq",
    tool: chapterTool,
    schema: chapterOutputSchema,
    systemPrompt:
      "You are Loreloom's Story Composer agent. You create immersive, culturally grounded narratives about Karnataka's heritage. You bring historical sites, folklore, festivals, and artisan traditions to life through vivid storytelling. You always maintain respect for cultural significance and historical accuracy. STRICT PROSE RULE: Never use hyphens (-) or em-dashes (—) in the story text prose. Write smooth, natural sentences using commas, periods, or conjunctions instead of dashes. Return canon updates through the required tool only; never include past chapter text in the story bible. When describing historical events, clearly distinguish between documented history and creative interpretation.",
    prompt,
    temperature: 0.75
  });

  return { ...result, research: researchEvidence ?? undefined };
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
      temperature: input.temperature
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

function formatResearchForPrompt(evidence: ResearchEvidence): string {
  const claimsByType = new Map<string, string[]>();

  for (const claim of evidence.claims) {
    const type = claim.type;
    const existing = claimsByType.get(type) ?? [];
    existing.push(`- ${claim.claim} [Source: ${claim.source.domain}, confidence: ${claim.confidence.toFixed(2)}]`);
    claimsByType.set(type, existing);
  }

  const sections: string[] = [];
  for (const [type, claims] of claimsByType) {
    sections.push(`[${type}]`);
    sections.push(claims.join("\n"));
    sections.push("");
  }

  return sections.join("\n").slice(0, 4000); // Cap to avoid prompt bloat
}
