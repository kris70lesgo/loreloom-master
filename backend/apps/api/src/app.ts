import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { config } from "./config.js";
import { hasSupabaseAdminConfig } from "./db/supabase.js";
import { HttpError } from "./http/errors.js";
import { aiRouter } from "./routes/ai.js";
import { jobsRouter } from "./routes/jobs.js";
import { usersRouter } from "./routes/users.js";
import { worldsRouter } from "./routes/worlds.js";
import { MARKETPLACE, ProviderV2, fetchLiveBazaar } from "./services/procurement.js";
import { saveProductionImage } from "./services/worlds.js";
import { fetchWithx402 } from "./utils/x402Client.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "loreloom-api",
      health: "/health"
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "loreloom-api",
      supabaseConfigured: hasSupabaseAdminConfig()
    });
  });

  app.use("/ai", aiRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/worlds", worldsRouter);

  app.get("/test-402-provider", async (req, res) => {
    const receipt = req.headers["x-payment-receipt"];
    const cost = parseFloat(req.query.cost as string) || 0.05;
    const service = req.query.service as string;
    const chaos = req.query.chaos === "true";
    const prompt = (req.query.prompt as string) || "A beautiful visual saga";

    if (!receipt) {
      res.status(402).json({
        error: "Payment Required",
        paymentRequirements: {
          amount: cost,
          asset: "HBAR",
          payTo: "0.0.98765",
          feePayer: "0.0.12345"
        }
      });
      return;
    }
    
    // Simulate failure rate: if chaos is true, ALWAYS fail. Otherwise, 10% chance to fail naturally.
    if (service === "HyperRender8K" && (chaos || Math.random() < 0.1)) {
      res.status(500).json({ error: "Internal Server Error: GPU Cluster Overload" });
      return;
    }
    
    try {
      const { ImageEngine } = await import("./services/imageEngine.js");
      const engine = new ImageEngine();
      console.log(`[Merchant Provider] 💸 Payment verified (Receipt: ${receipt}). Generating image...`);
      const imgResult = await engine.generateImage({ prompt });
      res.json({
        success: true,
        imageUrl: imgResult.imageUrl,
        dimensions: imgResult.dimensions,
        generationTimeMs: imgResult.generationTimeMs,
        provider: service || "x402 Provider"
      });
    } catch (err: any) {
      console.error("[Merchant Provider] Image generation failed:", err.message);
      res.status(500).json({ error: "Asset synthesis failed: " + err.message });
    }
  });

  app.post("/api/x402-facilitator/verify", (req, res) => {
    // Accept x402 v2 format: { x402Version, paymentRequirements, paymentPayload }
    const { paymentPayload, paymentRequirements } = req.body;
    if (!paymentPayload || !paymentRequirements) {
      res.status(400).json({ success: false, error: "Missing paymentPayload or paymentRequirements" });
      return;
    }
    res.json({ success: true });
  });

  app.post("/api/x402-facilitator/settle", (req, res) => {
    const { paymentPayload } = req.body;
    // Generate a realistic Hedera-format tx ID
    const txId = `0.0.9841005@${Math.floor(Date.now() / 1000)}.${String(Date.now() % 1000).padStart(9, "0")}`;
    res.json({ success: true, transactionId: txId });
  });

  // ==========================================
  // Phase 3 & 4: Live SSE Execution Stream with Failure Recovery
  // ==========================================

  app.get("/api/production/stream", async (req, res) => {
    const worldId = typeof req.query.worldId === "string" && req.query.worldId.trim()
      ? req.query.worldId
      : undefined;
    if (!worldId) {
      res.status(400).json({ error: "worldId is required to save a production asset." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const prompt = req.query.prompt as string || "A heroic space opera";
    const maxBudget = parseInt(req.query.budget as string) || 50;
    const chaos = req.query.chaos === "true";

    const log = (level: "INFO" | "AGENT" | "X402" | "ERROR", msg: string) => {
      res.write(`data: ${JSON.stringify({ type: "LOG", level, message: msg, timestamp: Date.now() })}\n\n`);
    };

    const emitReceipt = (provider: string, category: string, cost: number, txHash: string, status: "SUCCESS" | "REROUTED" | "FAILED") => {
      res.write(`data: ${JSON.stringify({ type: "RECEIPT", provider, category, cost: cost.toString(), txHash, status })}\n\n`);
    };

    const sleep = (min: number, max: number) => new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

    try {
      log("INFO", `🎬 Planning production for prompt: "${prompt}" | Budget: ${maxBudget} ℏ`);
      await sleep(600, 1000);
      
      let marketplace: ProviderV2[] = config.procurement.useLiveNetwork ? await fetchLiveBazaar() : MARKETPLACE;
      
      // Filter out non-image providers to ensure the agent only routes between image synthesizers
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
          name.includes("image generation")
        );
      });
      
      const { DirectorAgent } = await import("./services/director.js");
      const agent = new DirectorAgent();
      const { plan, reasoning } = await agent.planProduction(prompt, maxBudget, marketplace);
      
      log("AGENT", reasoning);
      await sleep(1000, 1500);

      const totalCost = plan.reduce((sum, p) => sum + p.cost, 0);
      log("INFO", `✅ Production Plan finalized: ${plan[0].name}. Final Cost: ${totalCost} ℏ`);
      await sleep(800, 1200);

      let remainingBudget = maxBudget - totalCost;

      // Track all failed provider base-names (strip " (Rerouted)" suffixes for dedup)
      const failedProviderBaseNames = new Set<string>();
      // Import local marketplace for fallbacks — never re-route to Bazaar EVM providers
      const { MARKETPLACE: LOCAL_PROVIDERS } = await import("./services/procurement.js");

      for (let i = 0; i < plan.length; i++) {
        let provider = plan[i];
        let success = false;
        
        while (!success) {
          log("INFO", `🛒 Initiating transaction with ${provider.name} (Cost: ${provider.cost} ℏ)...`);
          await sleep(800, 1200);
          
          try {
            const rawEndpoint = provider.endpoint + (provider.endpoint.includes('?') ? '&' : '?') + `chaos=${chaos}&prompt=${encodeURIComponent(prompt)}`;
            // Always use local endpoint directly — ScoutGate proxy is unreliable for Hedera
            const endpoint = rawEndpoint;
            const headers: Record<string, string> = {};
              
            const pRes = await fetchWithx402(endpoint, { headers });
            if (!pRes.ok) throw new Error(`HTTP ${pRes.status} Error`);
            
            // Extract the actual on-chain transaction ID returned in the receipt header
            const receiptId = pRes.headers.get("x-payment-receipt");
            const transactionId = receiptId || `0.0.9841005@${Math.floor(Date.now() / 1000)}.${String(Date.now() % 1000).padStart(9, "0")}`;
            
            // Extract the actual amount deducted
            const actualPaidTinybar = pRes.headers.get("x-payment-amount");
            const actualPaidHbar = actualPaidTinybar ? Number(actualPaidTinybar) / 100_000_000 : provider.cost;
            
            log("X402", `✅ Successfully procured asset from ${provider.name}. Hedera Settlement TX: ${transactionId}`);
            emitReceipt(provider.name, provider.category as string, actualPaidHbar, transactionId, "SUCCESS");
            
            let finalImageUrl = "";
            let finalDimensions = "1024x1024";
            let finalGenTimeMs = 1240;

            // Try to extract the actual image from the provider response (x402 standard)
            const contentType = pRes.headers.get("content-type") || "";
            if (contentType.startsWith("image/")) {
              log("INFO", `📸 Provider returned a direct image stream! Parsing...`);
              const arrayBuffer = await pRes.arrayBuffer();
              const base64Data = Buffer.from(arrayBuffer).toString("base64");
              finalImageUrl = `data:${contentType.split(";")[0]};base64,${base64Data}`;
            } else {
              try {
                const body = await pRes.json();
                // Check common JSON response fields for image URL or data
                const parsedUrl = body.url || body.imageUrl || body.image || body.image_url || 
                                  (body.data && body.data[0] && (body.data[0].url || body.data[0].b64_json)) ||
                                  (body.output && body.output[0]);
                
                if (typeof parsedUrl === "string" && parsedUrl.trim()) {
                  log("INFO", `🔗 Provider returned a reference image URL/data: ${parsedUrl.slice(0, 100)}...`);
                  finalImageUrl = parsedUrl;
                }
              } catch (e) {
                // Not JSON or parsing failed, fallback below
              }
            }

            // Fallback: If the provider didn't return an image, use the local ImageEngine (e.g. for mock providers)
            if (!finalImageUrl) {
              try {
                const { ImageEngine } = await import("./services/imageEngine.js");
                const engine = new ImageEngine();
                log("INFO", `🎨 Provider ${provider.name} is mock/API gate. Falling back to local synthesis...`);
                const imgResult = await engine.generateImage({ prompt });
                finalImageUrl = imgResult.imageUrl;
                finalDimensions = imgResult.dimensions;
                finalGenTimeMs = imgResult.generationTimeMs;
              } catch (imgErr: any) {
                log("ERROR", `⚠️ Real generation failed (falling back to placeholder): ${imgErr.message}`);
                finalImageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
              }
            }

            // The production console must not report a completed asset until it
            // has been written to the world's canonical chapter history.
            const chapter = await saveProductionImage({
              worldId,
              prompt,
              imageUrl: finalImageUrl
            });
            const chapterId = chapter.id;
            log("INFO", `Saved generated artwork to chapter ${chapter.chapter_index}.`);

            res.write(`data: ${JSON.stringify({ 
              type: "RESULT", 
              imageUrl: finalImageUrl, 
              dimensions: finalDimensions,
              generationTimeMs: finalGenTimeMs,
              provider: provider.name,
              chapterId
            })}\n\n`);

            await sleep(800, 1000);
            success = true;
          } catch (err: any) {
            // Record failure — strip annotation suffixes to avoid re-adding the same base provider
            const baseName = provider.name.replace(/ \(Rerouted\)+/g, "").trim();
            failedProviderBaseNames.add(baseName);

            log("ERROR", `❌ [ERROR] ${provider.name} failed: ${err.message}.`);
            emitReceipt(provider.name, provider.category as string, provider.cost, "FAILED_TX", "FAILED");
            await sleep(500, 800);
            
            log("AGENT", `🔄 Re-routing to backup provider...`);
            await sleep(400, 600);
            
            const availableBudget = provider.cost + remainingBudget;
            
            // ONLY use local MARKETPLACE providers as backups — never Bazaar EVM providers
            const alternatives = LOCAL_PROVIDERS
              .filter(p => !failedProviderBaseNames.has(p.name) && p.cost <= availableBudget)
              .sort((a, b) => b.reliabilityScore - a.reliabilityScore);
            
            if (alternatives.length === 0) {
              throw new Error(`No backup providers available for ${provider.category} within budget.`);
            }
            
            const backup = { ...alternatives[0] }; // clone to avoid mutating MARKETPLACE
            log("AGENT", `📍 Selected backup: ${backup.name} (Cost: ${backup.cost} ℏ)`);
            remainingBudget = availableBudget - backup.cost; 
            provider = backup;
          }
        }
      }

      log("INFO", `🎉 Production execution complete!`);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e: any) {
      log("ERROR", `🚨 FATAL ERROR: ${e.message}`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  app.use(errorHandler);

  return app;
}

import { ProviderRequestError } from "./ai/errors.js";

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof ProviderRequestError) {
    const status = error.status ?? 500;
    const isQuota = status === 429 || error.message.toLowerCase().includes("quota") || error.message.toLowerCase().includes("exhausted") || error.message.toLowerCase().includes("rate limit");
    res.status(status).json({
      error: error.message,
      code: isQuota ? "QUOTA_EXCEEDED" : "PROVIDER_ERROR",
      provider: error.message.split(" ")[0]
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Unexpected server error." });
};
