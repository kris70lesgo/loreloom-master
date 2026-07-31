import { getSupabaseAdmin } from "../db/supabase.js";
import { getProvidersByCategory, calculateUtilityScore } from "./procurement.js";
import { processX402Payment, simulateProviderEndpoint } from "./x402.js";

export async function generateProductionPlans(worldId: string, budgetHbar: number) {
  const supabase = getSupabaseAdmin();
  const categories = ["story", "portrait", "illustration", "voice", "music"];
  
  const plans = [
    { type: "budget", multiplier: 0.3 },
    { type: "balanced", multiplier: 0.7 },
    { type: "premium", multiplier: 1.5 },
  ];

  for (const planDef of plans) {
    let estCost = 0;
    let estDuration = 0;
    let qualitySum = 0;
    const allocations: Record<string, string> = {};

    for (const cat of categories) {
      const providers = await getProvidersByCategory(cat);
      if (providers.length === 0) continue;
      
      const maxCatBudget = (budgetHbar / categories.length) * planDef.multiplier;
      const affordable = providers.filter(p => p.base_cost_hbar <= maxCatBudget);
      
      const candidates = affordable.length > 0 ? affordable : providers;
      candidates.sort((a, b) => {
        if (planDef.type === "budget") return a.base_cost_hbar - b.base_cost_hbar;
        if (planDef.type === "premium") return b.base_cost_hbar - a.base_cost_hbar;
        return calculateUtilityScore(b) - calculateUtilityScore(a);
      });

      const selected = candidates[0];
      allocations[cat] = selected.id;
      estCost += selected.base_cost_hbar;
      estDuration += selected.latency_ms;
      qualitySum += calculateUtilityScore(selected);
    }

    await supabase.from("production_plans").insert({
      world_id: worldId,
      plan_type: planDef.type,
      estimated_cost_hbar: estCost,
      estimated_duration_ms: estDuration,
      estimated_quality_score: qualitySum / categories.length,
      provider_allocations: allocations
    });
  }
}

export async function purchaseService(worldId: string, chapterId: string | null, providerId: string, taskType: string) {
  const supabase = getSupabaseAdmin();
  
  const { data: provider } = await supabase.from("provider_registry").select("*").eq("id", providerId).single();
  if (!provider) throw new Error("Provider not found");
  
  const { data: procurement } = await supabase.from("procurements").insert({
    world_id: worldId,
    chapter_id: chapterId,
    provider_id: providerId,
    task_type: taskType,
    cost_hbar: provider.base_cost_hbar
  }).select().single();
  
  try {
    await simulateProviderEndpoint(provider.name, provider.base_cost_hbar, true);
  } catch (err: any) {
    if (err.name === "X402Error") {
      const receipt = await processX402Payment(err.challenge);
      
      await supabase.from("procurements").update({
        status: "purchased",
        payment_receipt: JSON.stringify(receipt),
        hashscan_url: receipt.hashscan_url
      }).eq("id", procurement.id);
      
      await supabase.from("provider_reputation_history").insert({
        provider_id: providerId,
        procurement_id: procurement.id,
        event_type: "success",
        score_delta: 0.01
      });
      
      return procurement;
    }
    throw err;
  }
}

// ==========================================
// Phase 2: Autonomous Director Agent
// ==========================================

import { MARKETPLACE, ProviderV2, fetchLiveBazaar } from "./procurement.js";
import { fetchWithx402 } from "../utils/x402Client.js";
import { config } from "../config.js";
import { simulateChaos } from "../utils/chaosSimulator.js";

export class DirectorAgent {
  calculateProviderV2Utility(provider: ProviderV2): number {
    // Utility = (Quality * 0.4) + (Speed * 0.3) - (Normalized_Cost * 0.3)
    const MAX_COST = 3; // HBAR max cost normalization for Image Generation models
    
    const qualityScore = provider.quality / 100;
    const speedScore = provider.speed / 100;
    const normalizedCost = Math.min(1, provider.cost / MAX_COST);

    return (qualityScore * 0.4) + (speedScore * 0.3) - (normalizedCost * 0.3);
  }

  async planProduction(prompt: string, maxBudget: number, customMarketplace?: ProviderV2[]): Promise<{ plan: ProviderV2[], reasoning: string }> {
    console.log(`\n🎬 DirectorAgent planning image production for prompt: "${prompt}" | Budget: ${maxBudget} ℏ`);
    
    let marketplace: ProviderV2[] = customMarketplace || (config.procurement.useLiveNetwork ? await fetchLiveBazaar() : MARKETPLACE);
    
    // Filter to only include image generation providers
    marketplace = marketplace.filter(p => {
      const cat = (p.category || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return (
        cat === "image" ||
        cat === "image_gen" ||
        cat === "image-generation" ||
        cat === "portrait" ||
        cat === "illustration" ||
        name.includes("flux") ||
        name.includes("sdxl") ||
        name.includes("midjourney") ||
        name.includes("stable diffusion") ||
        name.includes("image generation") ||
        name.includes("stable diffusion")
      );
    });

    // Filter out providers that exceed budget
    const affordableProviders = marketplace.filter(p => p.cost <= maxBudget);
    
    if (affordableProviders.length === 0) {
      throw new Error(`❌ Insufficient budget. No image generation providers found under ${maxBudget} ℏ.`);
    }

    // Sort marketplace by pure utility first (ignoring budget, just to see what the absolute best was)
    const sortedByUtilityAll = [...marketplace].sort((a, b) => this.calculateProviderV2Utility(b) - this.calculateProviderV2Utility(a));
    const absoluteBestProvider = sortedByUtilityAll[0];
    
    // Sort affordable by utility
    affordableProviders.sort((a, b) => this.calculateProviderV2Utility(b) - this.calculateProviderV2Utility(a));
    const selectedProvider = affordableProviders[0];
    
    let reasoning = "";
    if (selectedProvider.name === absoluteBestProvider.name) {
      reasoning = `Selected ${selectedProvider.name} (${selectedProvider.cost} ℏ) as it offers the highest overall utility.`;
    } else {
      reasoning = `Selected ${selectedProvider.name} (${selectedProvider.cost} ℏ) instead of ${absoluteBestProvider.name} (${absoluteBestProvider.cost} ℏ) to remain within the ${maxBudget} ℏ budget.`;
    }
    
    return { plan: [selectedProvider], reasoning };
  }

  async executeProduction(plan: ProviderV2[], prompt: string, maxBudget: number, chaosTarget?: string): Promise<ProviderV2[]> {
    console.log(`\n🚀 DirectorAgent executing production plan...`);
    
    // We will mutate the plan if a provider fails and we need to replan
    let currentPlan = [...plan];
    let failedProviderNames = new Set<string>();
    let unspentBudget = Number(maxBudget.toFixed(4));

    for (let i = 0; i < currentPlan.length; i++) {
      let provider = currentPlan[i];
      let success = false;
      let attempts = 0;

      while (!success && attempts < 2) {
        attempts++;
        console.log(`\n🛒 Purchasing from ${provider.name} (Cost: ${provider.cost} ℏ)...`);
        try {
          const isLocal = provider.endpoint.includes("localhost") || provider.endpoint.includes("127.0.0.1");
          
          const url = (config.procurement.useLiveNetwork && !isLocal) 
            ? "https://x402-scoutgate.onrender.com" 
            : provider.endpoint;
            
          const headers: Record<string, string> = (config.procurement.useLiveNetwork && !isLocal) 
            ? { "X-Target-Url": provider.endpoint } 
            : {};

          const res = await fetchWithx402(url, { headers });
          if (!res.ok) {
            throw new Error(`HTTP Error ${res.status}`);
          }
          
          if (chaosTarget) {
            simulateChaos(provider.name, chaosTarget);
          }
          const data = await res.json();
          unspentBudget = Number((unspentBudget - provider.cost).toFixed(4));
          console.log(`✅ Successfully procured asset from ${provider.name}:`, data);
          console.log(`💰 Remaining unspent budget: ${unspentBudget} ℏ`);
          success = true;
        } catch (err: any) {
          console.error(`❌ Failed to procure from ${provider.name} on attempt ${attempts}:`, err.message);
          
          if (attempts >= 2 || (err.message && err.message.includes("HTTP Error 500")) || (err.message && err.message.includes("HTTP Error 429"))) {
            console.log(`[CHAOS_EVENT] Provider ${provider.name} failed with ${err.message}. Re-routing...`);
            failedProviderNames.add(provider.name);
            
            // Query the registry for the next best alternative provider
            const marketplace = config.procurement.useLiveNetwork ? await fetchLiveBazaar() : MARKETPLACE;
            
            // Filter marketplace to only include image generators
            const imageMarketplace = marketplace.filter(p => {
              const cat = (p.category || "").toLowerCase();
              const name = (p.name || "").toLowerCase();
              return (
                cat === "image" ||
                cat === "image_gen" ||
                cat === "image-generation" ||
                cat === "portrait" ||
                cat === "illustration" ||
                name.includes("flux") ||
                name.includes("sdxl") ||
                name.includes("midjourney") ||
                name.includes("stable diffusion") ||
                name.includes("image generation")
              );
            });

            const alternatives = imageMarketplace
              .filter(p => !failedProviderNames.has(p.name) && p.cost <= unspentBudget)
              .sort((a, b) => this.calculateProviderV2Utility(b) - this.calculateProviderV2Utility(a));

            if (alternatives.length > 0) {
              const nextBest = alternatives[0];
              console.log(`🔄 Re-routing: Selected next best alternative ${nextBest.name} (Cost: ${nextBest.cost} ℏ) within remaining budget (${unspentBudget} ℏ).`);
              currentPlan[i] = nextBest;
              provider = nextBest;
              attempts = 0; // Reset attempts for the new provider
            } else {
              throw new Error(`❌ Production Failed: No valid alternatives found for category ${provider.category} within remaining budget ${unspentBudget} ℏ`);
            }
          }
        }
      }
    }
    console.log(`\n🎉 Production execution complete!`);
    return currentPlan; // Return the final plan for testing assertion
  }
}
