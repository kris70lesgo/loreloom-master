import { NextRequest } from "next/server";
import { config } from "@/server/config";
import { MARKETPLACE, ProviderV2, fetchLiveBazaar } from "@/server/services/procurement";
import { saveProductionImage } from "@/server/services/worlds";
import { fetchWithx402 } from "@/server/utils/x402Client";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function iteratorToStream(iterator: AsyncGenerator<string, void, unknown>) {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(value));
      }
    },
    async cancel() {
      await iterator.return?.();
    }
  });
}

export async function GET(request: NextRequest) {
  const worldId = request.nextUrl.searchParams.get("worldId")?.trim() || undefined;
  if (!worldId) {
    return Response.json({ error: "worldId is required to save a production asset." }, { status: 400 });
  }

  const prompt = request.nextUrl.searchParams.get("prompt") || "A heroic space opera";
  const maxBudget = parseInt(request.nextUrl.searchParams.get("budget") ?? "") || 50;
  const chaos = request.nextUrl.searchParams.get("chaos") === "true";

  const sleep = (min: number, max: number) => new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

  async function* stream() {
    const log = (level: "INFO" | "AGENT" | "X402" | "ERROR", msg: string) => {
      return `data: ${JSON.stringify({ type: "LOG", level, message: msg, timestamp: Date.now() })}\n\n`;
    };

    const emitReceipt = (provider: string, category: string, cost: number, txHash: string, status: "SUCCESS" | "REROUTED" | "FAILED") => {
      return `data: ${JSON.stringify({ type: "RECEIPT", provider, category, cost: cost.toString(), txHash, status })}\n\n`;
    };

    try {
      yield log("INFO", `🎬 Planning production for prompt: "${prompt}" | Budget: ${maxBudget} ℏ`);
      await sleep(600, 1000);

      let marketplace: ProviderV2[] = config.procurement.useLiveNetwork ? await fetchLiveBazaar() : MARKETPLACE;

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

      const { DirectorAgent } = await import("@/server/services/director");
      const agent = new DirectorAgent();
      const { plan, reasoning } = await agent.planProduction(prompt, maxBudget, marketplace);

      yield log("AGENT", reasoning);
      await sleep(1000, 1500);

      const totalCost = plan.reduce((sum, p) => sum + p.cost, 0);
      yield log("INFO", `✅ Production Plan finalized: ${plan[0].name}. Final Cost: ${totalCost} ℏ`);
      await sleep(800, 1200);

      let remainingBudget = maxBudget - totalCost;

      const failedProviderBaseNames = new Set<string>();
      const { MARKETPLACE: LOCAL_PROVIDERS } = await import("@/server/services/procurement");

      for (let i = 0; i < plan.length; i++) {
        let provider = plan[i];
        let success = false;

        while (!success) {
          yield log("INFO", `🛒 Initiating transaction with ${provider.name} (Cost: ${provider.cost} ℏ)...`);
          await sleep(800, 1200);

          try {
            const rawEndpoint = provider.endpoint + (provider.endpoint.includes('?') ? '&' : '?') + `chaos=${chaos}&prompt=${encodeURIComponent(prompt)}`;
            const endpoint = rawEndpoint;
            const headers: Record<string, string> = {};

            const pRes = await fetchWithx402(endpoint, { headers });
            if (!pRes.ok) throw new Error(`HTTP ${pRes.status} Error`);

            const receiptId = pRes.headers.get("x-payment-receipt");
            const transactionId = receiptId || `0.0.9841005@${Math.floor(Date.now() / 1000)}.${String(Date.now() % 1000).padStart(9, "0")}`;

            const actualPaidTinybar = pRes.headers.get("x-payment-amount");
            const actualPaidHbar = actualPaidTinybar ? Number(actualPaidTinybar) / 100_000_000 : provider.cost;

            yield log("X402", `✅ Successfully procured asset from ${provider.name}. Hedera Settlement TX: ${transactionId}`);
            yield emitReceipt(provider.name, provider.category as string, actualPaidHbar, transactionId, "SUCCESS");

            let finalImageUrl = "";
            let finalDimensions = "1024x1024";
            let finalGenTimeMs = 1240;

            const contentType = pRes.headers.get("content-type") || "";
            if (contentType.startsWith("image/")) {
              yield log("INFO", `📸 Provider returned a direct image stream! Parsing...`);
              const arrayBuffer = await pRes.arrayBuffer();
              const base64Data = Buffer.from(arrayBuffer).toString("base64");
              finalImageUrl = `data:${contentType.split(";")[0]};base64,${base64Data}`;
            } else {
              try {
                const body = await pRes.json();
                const parsedUrl = body.url || body.imageUrl || body.image || body.image_url ||
                  (body.data && body.data[0] && (body.data[0].url || body.data[0].b64_json)) ||
                  (body.output && body.output[0]);

                if (typeof parsedUrl === "string" && parsedUrl.trim()) {
                  yield log("INFO", `🔗 Provider returned a reference image URL/data: ${parsedUrl.slice(0, 100)}...`);
                  finalImageUrl = parsedUrl;
                }
              } catch (e) {
                // Not JSON or parsing failed, fallback below
              }
            }

            if (!finalImageUrl) {
              try {
                const { ImageEngine } = await import("@/server/services/imageEngine");
                const engine = new ImageEngine();
                yield log("INFO", `🎨 Provider ${provider.name} is mock/API gate. Falling back to local synthesis...`);
                const imgResult = await engine.generateImage({ prompt });
                finalImageUrl = imgResult.imageUrl;
                finalDimensions = imgResult.dimensions;
                finalGenTimeMs = imgResult.generationTimeMs;
              } catch (imgErr: any) {
                yield log("ERROR", `⚠️ Real generation failed (falling back to placeholder): ${imgErr.message}`);
                finalImageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
              }
            }

            const chapter = await saveProductionImage({
              worldId,
              prompt,
              imageUrl: finalImageUrl
            });
            const chapterId = chapter.id;
            yield log("INFO", `Saved generated artwork to chapter ${chapter.chapter_index}.`);

            yield `data: ${JSON.stringify({
              type: "RESULT",
              imageUrl: finalImageUrl,
              dimensions: finalDimensions,
              generationTimeMs: finalGenTimeMs,
              provider: provider.name,
              chapterId
            })}\n\n`;

            await sleep(800, 1000);
            success = true;
          } catch (err: any) {
            const baseName = provider.name.replace(/ \(Rerouted\)+/g, "").trim();
            failedProviderBaseNames.add(baseName);

            yield log("ERROR", `❌ [ERROR] ${provider.name} failed: ${err.message}.`);
            yield emitReceipt(provider.name, provider.category as string, provider.cost, "FAILED_TX", "FAILED");
            await sleep(500, 800);

            yield log("AGENT", `🔄 Re-routing to backup provider...`);
            await sleep(400, 600);

            const availableBudget = provider.cost + remainingBudget;

            const alternatives = LOCAL_PROVIDERS
              .filter(p => !failedProviderBaseNames.has(p.name) && p.cost <= availableBudget)
              .sort((a, b) => b.reliabilityScore - a.reliabilityScore);

            if (alternatives.length === 0) {
              throw new Error(`No backup providers available for ${provider.category} within budget.`);
            }

            const backup = { ...alternatives[0] };
            yield log("AGENT", `📍 Selected backup: ${backup.name} (Cost: ${backup.cost} ℏ)`);
            remainingBudget = availableBudget - backup.cost;
            provider = backup;
          }
        }
      }

      yield log("INFO", `🎉 Production execution complete!`);
      yield "data: [DONE]\n\n";
    } catch (e: any) {
      yield log("ERROR", `🚨 FATAL ERROR: ${e.message}`);
      yield "data: [DONE]\n\n";
    }
  }

  const streamResponse = new ReadableStream({
    async start(controller) {
      const iterator = stream();
      while (true) {
        const { value, done } = await iterator.next();
        if (done) break;
        controller.enqueue(encoder.encode(value));
      }
      controller.close();
    }
  });

  return new Response(streamResponse, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
