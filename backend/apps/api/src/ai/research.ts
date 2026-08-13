import { z } from "zod";

export const claimTypeSchema = z.enum([
  "VERIFIED_HISTORY",
  "ARCHAEOLOGICAL_RECORD",
  "CULTURAL_TRADITION",
  "FOLKLORE",
  "LEGEND",
  "MYTHOLOGY",
  "COMMUNITY_ACCOUNT",
  "CURRENT_INFORMATION",
  "CREATIVE_INTERPRETATION"
]);

export type ClaimType = z.infer<typeof claimTypeSchema>;

export const sourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  domain: z.string(),
  snippet: z.string().optional(),
  retrievedAt: z.string().optional()
});

export type ResearchSource = z.infer<typeof sourceSchema>;

export const researchClaimSchema = z.object({
  claim: z.string().min(10),
  type: claimTypeSchema,
  confidence: z.number().min(0).max(1),
  source: sourceSchema
});

export type ResearchClaim = z.infer<typeof researchClaimSchema>;

export const researchEvidenceSchema = z.object({
  subject: z.string(),
  claims: z.array(researchClaimSchema).max(30),
  sources: z.array(sourceSchema).max(20),
  cachedAt: z.string().optional()
});

export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>;

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string | null;
}

export interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
  query?: string;
  response_time?: number;
}

export interface ResearchProvider {
  search(query: string, options?: ResearchSearchOptions): Promise<TavilyResult[]>;
}

export interface ResearchSearchOptions {
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  searchDepth?: "basic" | "advanced";
  topic?: "general" | "news";
}
