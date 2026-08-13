import { config } from "../config.js";
import { ProviderRequestError, ProviderSetupError } from "../ai/errors.js";
import type { ResearchProvider, ResearchSearchOptions, TavilyResult, TavilyResponse } from "../ai/research.js";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 15_000;

export class TavilyResearchProvider implements ResearchProvider {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.tavily.apiKey ?? "";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async search(query: string, options: ResearchSearchOptions = {}): Promise<TavilyResult[]> {
    if (!this.apiKey) {
      throw new ProviderSetupError("Tavily", "TAVILY_API_KEY");
    }

    const body = {
      api_key: this.apiKey,
      query,
      max_results: options.maxResults ?? 5,
      search_depth: options.searchDepth ?? "basic",
      topic: options.topic ?? "general",
      include_domains: options.includeDomains ?? [],
      exclude_domains: options.excludeDomains ?? [],
      include_answer: true,
      include_raw_content: false
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(TAVILY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderRequestError("Tavily", "Request timed out", 408);
      }
      throw new ProviderRequestError("Tavily", String(err), 503);
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      throw new ProviderRequestError("Tavily", "Rate limited", 429);
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProviderRequestError("Tavily", text || response.statusText, response.status);
    }

    const data = (await response.json().catch(() => ({}))) as Partial<TavilyResponse>;
    if (!Array.isArray(data.results)) return [];

    return data.results.flatMap((result) => {
      if (!result || typeof result !== "object") return [];
      const url = sanitizeUrl(result.url);
      if (!url) return [];
      return [{
        title: sanitizeText(result.title).slice(0, 300),
        url,
        content: sanitizeText(result.content).slice(0, 2000),
        score: typeof result.score === "number" && Number.isFinite(result.score) ? result.score : 0
      }];
    });
  }
}

let providerInstance: TavilyResearchProvider | null = null;

export function getTavilyProvider(): TavilyResearchProvider {
  providerInstance ??= new TavilyResearchProvider();
  return providerInstance;
}

function sanitizeText(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[INST\]/gi, "")
    .replace(/\[\/INST\]/gi, "")
    .trim();
}

function sanitizeUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString().slice(0, 500);
  } catch {
    return "";
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
