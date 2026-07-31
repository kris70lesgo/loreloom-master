import { getSupabaseAdmin } from "../db/supabase.js";
import { config } from "../config.js";

export interface Provider {
  id: string;
  name: string;
  category: "story" | "portrait" | "illustration" | "voice" | "music" | "animation";
  base_cost_hbar: number;
  latency_ms: number;
  reliability_score: number;
  style_tags: string[];
  endpoint_url?: string;
}

export const MOCK_PROVIDERS: Omit<Provider, "id">[] = [
  { name: "StoryWeaver AI", category: "story", base_cost_hbar: 5, latency_ms: 2000, reliability_score: 0.98, style_tags: ["fantasy", "sci-fi", "cyberpunk"] },
  { name: "CheapScript", category: "story", base_cost_hbar: 1, latency_ms: 5000, reliability_score: 0.85, style_tags: ["basic"] },
  { name: "PremiumNarrator", category: "story", base_cost_hbar: 15, latency_ms: 1500, reliability_score: 0.99, style_tags: ["cinematic", "literature"] },
  
  { name: "PixelForge", category: "portrait", base_cost_hbar: 8, latency_ms: 4000, reliability_score: 0.95, style_tags: ["anime", "cyberpunk"] },
  { name: "BudgetCanvas", category: "portrait", base_cost_hbar: 2, latency_ms: 8000, reliability_score: 0.80, style_tags: ["rough", "sketch"] },
  { name: "HyperRender 8K", category: "portrait", base_cost_hbar: 25, latency_ms: 6000, reliability_score: 0.99, style_tags: ["photorealistic", "cinematic"] },
  
  { name: "SceneGenix", category: "illustration", base_cost_hbar: 10, latency_ms: 5000, reliability_score: 0.93, style_tags: ["anime", "cyberpunk"] },
  { name: "FastSketch", category: "illustration", base_cost_hbar: 3, latency_ms: 2000, reliability_score: 0.88, style_tags: ["rough"] },
  { name: "EpicVisions", category: "illustration", base_cost_hbar: 30, latency_ms: 8000, reliability_score: 0.97, style_tags: ["cinematic", "photorealistic"] },
  
  { name: "VoiceSynthetix", category: "voice", base_cost_hbar: 6, latency_ms: 1000, reliability_score: 0.96, style_tags: ["dramatic", "calm"] },
  { name: "EchoBasic", category: "voice", base_cost_hbar: 1.5, latency_ms: 3000, reliability_score: 0.82, style_tags: ["robotic"] },
  
  { name: "HansZimmerBot", category: "music", base_cost_hbar: 20, latency_ms: 4000, reliability_score: 0.99, style_tags: ["orchestral", "cyberpunk"] },
  { name: "LoFiGenerator", category: "music", base_cost_hbar: 4, latency_ms: 1500, reliability_score: 0.91, style_tags: ["lofi", "ambient"] },
];

export async function ensureProvidersSeeded() {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("provider_registry").select("id").limit(1);
  if (!existing || existing.length === 0) {
    for (const p of MOCK_PROVIDERS) {
      await supabase.from("provider_registry").insert(p);
    }
    console.log("Seeded mock providers.");
  }
}

export async function getProvidersByCategory(category: string): Promise<Provider[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("provider_registry").select("*").eq("category", category);
  if (error) throw new Error(`Failed to fetch providers: ${error.message}`);
  return data as Provider[];
}

export function calculateUtilityScore(provider: Provider): number {
  const { quality, cost, reliability, latency } = config.procurement.utilityWeights;
  
  const estimatedQuality = Math.min(10, Math.max(1, provider.base_cost_hbar / 2));
  const costFactor = provider.base_cost_hbar > 0 ? (10 / provider.base_cost_hbar) : 10;
  const latencyFactor = Math.max(0, 10 - (provider.latency_ms / 1000));
  
  return (
    (quality * estimatedQuality) +
    (cost * costFactor) +
    (reliability * (provider.reliability_score * 10)) +
    (latency * latencyFactor)
  );
}

export async function findBestProvider(category: string, maxCostHbar?: number): Promise<Provider | null> {
  let providers = await getProvidersByCategory(category);
  
  if (maxCostHbar !== undefined && maxCostHbar !== null) {
    providers = providers.filter(p => p.base_cost_hbar <= maxCostHbar);
  }
  
  if (providers.length === 0) return null;
  
  providers.sort((a, b) => calculateUtilityScore(b) - calculateUtilityScore(a));
  
  return providers[0];
}

// ==========================================
// Phase 2: Autonomous Procurement Engine 
// ==========================================

export interface ProviderV2 {
  name: string;
  category: "Image" | string;
  tier: "Premium" | "Standard" | "Budget";
  cost: number; // in HBAR
  quality: number; // 1-100
  speed: number; // 1-100
  reliabilityScore: number;
  endpoint: string;
}

export const MARKETPLACE: ProviderV2[] = [
  { name: "Midjourney Proxy Engine", category: "Image", tier: "Premium", cost: 1.00, quality: 99, speed: 40, reliabilityScore: 95, endpoint: "http://localhost:4000/test-402-provider?cost=1.00" },
  { name: "FLUX.1 Ultra (8K)", category: "Image", tier: "Premium", cost: 0.50, quality: 95, speed: 70, reliabilityScore: 98, endpoint: "http://localhost:4000/test-402-provider?cost=0.50" },
  { name: "SDXL Turbo", category: "Image", tier: "Budget", cost: 0.05, quality: 75, speed: 99, reliabilityScore: 90, endpoint: "http://localhost:4000/test-402-provider?cost=0.05" },
  { name: "HuggingFace FLUX Schnell", category: "Image", tier: "Budget", cost: 0.01, quality: 80, speed: 85, reliabilityScore: 85, endpoint: "http://localhost:4000/test-402-provider?cost=0.01" }
];

export async function fetchLiveBazaar(): Promise<ProviderV2[]> {
  const url = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources";
  console.log(`\n🔍 Fetching live x402 Bazaar from Coinbase CDP: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch live bazaar: ${res.statusText}`);
    }
    const data = await res.json();
    
    const providers: ProviderV2[] = [];
    const items = data.items || data.resources || [];

    for (const item of items) {
      // Validate schema minimally
      if (!item.resource || !item.x402Version || !Array.isArray(item.accepts) || item.accepts.length === 0) {
        console.warn(`⚠️ Skipping invalid resource in bazaar:`, item.resource || 'unknown');
        continue;
      }
      
      const accepts = item.accepts;
      // Default to the first accepts array element
      const hbarAccepts = accepts.find((a: any) => a.asset === "HBAR") || accepts[0];
      
      let maxAmount = 10;
      const rawAmount = hbarAccepts ? (hbarAccepts.amount || hbarAccepts.maxAmountRequired) : null;

      if (rawAmount) {
        const atomicAmount = Number(rawAmount);
        const decimals = hbarAccepts.asset === "USDC" ? 6 : (hbarAccepts.asset === "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" ? 6 : 8); // Assuming Base USDC
        maxAmount = atomicAmount / Math.pow(10, decimals);
        // Fallback to reasonable integer if the resulting value is extremely tiny or huge due to weird mock data
        if (maxAmount < 0.0001 || maxAmount > 1000) {
           maxAmount = atomicAmount; // fallback to raw
        }
      }

      const name = item.serviceName || item.metadata?.name || item.resource.split("/").pop() || "Live API";
      const tags = Array.isArray(item.tags) ? item.tags : [];
      let category = item.metadata?.category || (tags.length > 0 ? tags[0] : "Unknown");
      
      const rawLatency = item.metadata?.latency || 2000;
      const speed = Math.max(1, 100 - (rawLatency / 100)); // normalized 1-100

      providers.push({
        name,
        category: category as any,
        tier: "Standard",
        cost: maxAmount,
        quality: item.metadata?.quality || 80,
        speed,
        reliabilityScore: item.quality?.l30DaysTotalCalls > 0 ? 99 : (item.metadata?.reliability || 90),
        endpoint: item.resource
      });
    }
    
    console.log(`✅ Fetched ${providers.length} valid live providers from the Bazaar.`);
    return [...providers, ...MARKETPLACE];
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error("❌ Failed to fetch live bazaar: HTTP request timed out after 5s.");
    } else {
      console.error("❌ Failed to fetch live bazaar:", err.message);
    }
    console.log("⚠️ Falling back to MOCK MARKETPLACE.");
    return MARKETPLACE;
  }
}

