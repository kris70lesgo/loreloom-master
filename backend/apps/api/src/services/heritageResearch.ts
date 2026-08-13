import { researchEvidenceSchema } from "../ai/research.js";
import type {
  ClaimType,
  ResearchClaim,
  ResearchEvidence,
  ResearchSearchOptions,
  ResearchSource,
  TavilyResult
} from "../ai/research.js";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "../db/supabase.js";
import { extractDomain, getTavilyProvider } from "./tavily.js";

const HIGH_AUTHORITY_DOMAINS = new Set([
  "whc.unesco.org", "unesco.org", "asi.nic.in", "karnataka.gov.in", "karnatakatourism.org",
  "mysoresamachar.com", "nma.gov.in", "indianculture.gov.in", "ignca.gov.in", "archaeology.gov.in"
]);
const MEDIUM_AUTHORITY_DOMAINS = new Set([
  "wikipedia.org", "britannica.com", "timesofindia.indiatimes.com", "thehindu.com",
  "deccanherald.com", "indianexpress.com", "incredibleindia.gov.in"
]);
const FOLKLORE_KEYWORDS = [
  "legend", "myth", "folklore", "story says", "according to legend", "it is said", "tradition", "oral", "believed"
];
const ARCHAEOLOGY_KEYWORDS = ["excavation", "archaeological", "inscription", "epigraph", "carbon dating", "artifact"];
const CURRENT_KEYWORDS = ["2024", "2025", "2026", "upcoming", "latest", "current", "recent", "this year", "schedule", "date announced"];
const RESEARCH_CATEGORIES = [
  { id: "history", querySuffix: "history UNESCO ASI archaeological" },
  { id: "architecture", querySuffix: "architecture monuments temple construction" },
  { id: "folklore", querySuffix: "folklore legends stories traditions Karnataka" },
  { id: "current", querySuffix: "festival dates events 2025 2026 Karnataka tourism" }
] as const;
const CACHE_TABLE = "heritage_research_cache";

export interface HeritageResearchInput {
  subject: string;
  kannadaName?: string;
  category?: string;
  forceFresh?: boolean;
  localKnowledge?: string;
}

/** Decide whether local context is too sparse or time-sensitive to answer without research. */
export function shouldResearch(input: HeritageResearchInput): boolean {
  if (input.forceFresh) return true;
  const localKnowledge = input.localKnowledge?.trim() ?? "";
  if (localKnowledge.length < 500) return true;
  const text = `${input.subject} ${input.category ?? ""}`.toLowerCase();
  return CURRENT_KEYWORDS.some((keyword) => text.includes(keyword)) || input.category === "festivals";
}

export async function researchHeritageSubject(input: HeritageResearchInput): Promise<ResearchEvidence | null> {
  const { subject, forceFresh = false } = input;
  if (!subject || subject.trim().length < 3 || !shouldResearch(input)) return null;

  const cleanSubject = subject.trim().slice(0, 200);
  const tavily = getTavilyProvider();
  if (!tavily.isConfigured()) {
    console.warn("[heritage-research] Tavily not configured — skipping web research.");
    return null;
  }

  if (!forceFresh) {
    const cached = await getCachedResearch(cleanSubject);
    if (cached) {
      console.log(`[heritage-research] Cache hit for "${cleanSubject}"`);
      return cached;
    }
  }

  const allResults: TavilyResult[] = [];
  const seenUrls = new Set<string>();
  for (const query of generateSearchQueries(cleanSubject, input.category)) {
    const options: ResearchSearchOptions = {
      maxResults: 5,
      searchDepth: "basic",
      topic: query.includes("2025") || query.includes("2026") ? "news" : "general"
    };
    try {
      const startTime = Date.now();
      const results = await tavily.search(query, options);
      console.log(`[heritage-research] Query: "${query}" → ${results.length} results in ${Date.now() - startTime}ms`);
      for (const result of results) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }
    } catch (err) {
      console.warn(`[heritage-research] Search failed for "${query}":`, err);
    }
  }

  if (allResults.length === 0) {
    console.warn(`[heritage-research] No results found for "${cleanSubject}"`);
    return null;
  }

  const evidence: ResearchEvidence = {
    subject: cleanSubject,
    claims: classifyResults(allResults, cleanSubject),
    sources: extractSources(allResults),
    cachedAt: new Date().toISOString()
  };
  await cacheResearch(cleanSubject, evidence);
  console.log(`[heritage-research] Completed research for "${cleanSubject}": ${evidence.claims.length} claims from ${evidence.sources.length} sources`);
  return evidence;
}

function generateSearchQueries(subject: string, category?: string): string[] {
  const queries = [`${subject} Karnataka heritage history significance`];
  for (const researchCategory of RESEARCH_CATEGORIES) {
    if (researchCategory.id === "current" && category && !["festivals", "sites"].includes(category)) continue;
    queries.push(`${subject} ${researchCategory.querySuffix} Karnataka India`);
  }
  return queries.slice(0, 4);
}

function classifyResults(results: TavilyResult[], subject: string): ResearchClaim[] {
  const claims: ResearchClaim[] = [];
  for (const result of results) {
    const claim = extractClaimText(result.content, subject);
    if (claim.length < 10) continue;
    const domain = extractDomain(result.url);
    const type = inferClaimType(result.content, domain, result.title);
    const source: ResearchSource = {
      title: result.title,
      url: result.url,
      domain,
      snippet: result.content.slice(0, 300),
      retrievedAt: new Date().toISOString()
    };
    claims.push({ claim, type, confidence: computeConfidence(getDomainAuthority(domain), type, result.score), source });
  }
  return claims.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}

function inferClaimType(content: string, domain: string, title: string): ClaimType {
  const text = `${content} ${title}`.toLowerCase();
  if (CURRENT_KEYWORDS.some((keyword) => text.includes(keyword))) return "CURRENT_INFORMATION";
  if (ARCHAEOLOGY_KEYWORDS.some((keyword) => text.includes(keyword))) return "ARCHAEOLOGICAL_RECORD";
  if (FOLKLORE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    if (text.includes("myth")) return "MYTHOLOGY";
    if (text.includes("legend")) return "LEGEND";
    return "FOLKLORE";
  }
  if (HIGH_AUTHORITY_DOMAINS.has(domain)) return "VERIFIED_HISTORY";
  if (["tradition", "festival", "ritual", "celebrated", "performed"].some((keyword) => text.includes(keyword))) {
    return "CULTURAL_TRADITION";
  }
  if (MEDIUM_AUTHORITY_DOMAINS.has(domain) || getDomainAuthority(domain) > 0.5) return "VERIFIED_HISTORY";
  return "COMMUNITY_ACCOUNT";
}

function getDomainAuthority(domain: string): number {
  if (HIGH_AUTHORITY_DOMAINS.has(domain)) return 0.95;
  if (MEDIUM_AUTHORITY_DOMAINS.has(domain)) return 0.7;
  if (domain.endsWith(".gov.in") || domain.endsWith(".nic.in")) return 0.9;
  if (domain.endsWith(".edu") || domain.endsWith(".ac.in")) return 0.8;
  if (["tourism", "heritage", "culture"].some((term) => domain.includes(term))) return 0.6;
  return 0.3;
}

function computeConfidence(authority: number, type: ClaimType, tavilyScore: number): number {
  const multipliers: Record<ClaimType, number> = {
    VERIFIED_HISTORY: 1, ARCHAEOLOGICAL_RECORD: 1, CULTURAL_TRADITION: 0.85,
    FOLKLORE: 0.6, LEGEND: 0.6, MYTHOLOGY: 0.6, COMMUNITY_ACCOUNT: 0.5,
    CURRENT_INFORMATION: 0.8, CREATIVE_INTERPRETATION: 0.7
  };
  let confidence = authority * multipliers[type];
  if (tavilyScore > 0) confidence = (confidence + tavilyScore) / 2;
  return Math.min(1, Math.max(0, confidence));
}

function extractClaimText(content: string, subject: string): string {
  if (content.length < 10) return "";
  const sentences = content.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 15);
  const subjectLower = subject.toLowerCase();
  const words = subjectLower.split(/\s+/).filter((word) => word.length > 3);
  let best = "";
  let bestScore = 0;
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    let score = lower.includes(subjectLower) ? 3 : 0;
    for (const word of words) if (lower.includes(word)) score += 1;
    if (/\b(is|was|were|built|constructed|established|founded|ruled|dynasty|century|temple|kings?|empire)\b/.test(lower)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = sentence.trim();
    }
  }
  return (best || sentences[0]?.trim() || "").slice(0, 400);
}

function extractSources(results: TavilyResult[]): ResearchSource[] {
  return results.slice(0, 20).map((result) => ({
    title: result.title,
    url: result.url,
    domain: extractDomain(result.url),
    snippet: result.content.slice(0, 200),
    retrievedAt: new Date().toISOString()
  }));
}

async function getCachedResearch(subject: string): Promise<ResearchEvidence | null> {
  if (!hasSupabaseAdminConfig()) return null;
  try {
    const { data, error } = await getSupabaseAdmin().from(CACHE_TABLE).select("evidence, created_at")
      .eq("subject_hash", hashSubject(subject)).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data || Date.now() - new Date(data.created_at).getTime() > 168 * 60 * 60 * 1000) return null;
    const parsed = researchEvidenceSchema.safeParse(data.evidence);
    return parsed.success ? { ...parsed.data, cachedAt: data.created_at as string } : null;
  } catch (err) {
    console.warn("[heritage-research] Cache read failed:", err);
    return null;
  }
}

async function cacheResearch(subject: string, evidence: ResearchEvidence): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;
  try {
    const { error } = await getSupabaseAdmin().from(CACHE_TABLE).upsert({
      subject,
      subject_hash: hashSubject(subject),
      evidence,
      claim_count: evidence.claims.length,
      source_count: evidence.sources.length,
      created_at: new Date().toISOString()
    }, { onConflict: "subject_hash" });
    if (error) console.warn("[heritage-research] Cache write failed:", error.message);
  } catch (err) {
    console.warn("[heritage-research] Cache write failed:", err);
  }
}

function hashSubject(subject: string): string {
  let hash = 0;
  for (const character of subject.toLowerCase().trim()) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return `h_${Math.abs(hash).toString(36)}`;
}
