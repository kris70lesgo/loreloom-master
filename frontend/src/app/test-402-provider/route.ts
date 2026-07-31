import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const receipt = request.headers.get("x-payment-receipt");
  const cost = parseFloat(request.nextUrl.searchParams.get("cost") ?? "") || 0.05;
  const service = request.nextUrl.searchParams.get("service") ?? undefined;
  const chaos = request.nextUrl.searchParams.get("chaos") === "true";
  const prompt = request.nextUrl.searchParams.get("prompt") || "A beautiful visual saga";

  if (!receipt) {
    return NextResponse.json(
      {
        error: "Payment Required",
        paymentRequirements: {
          amount: cost,
          asset: "HBAR",
          payTo: "0.0.98765",
          feePayer: "0.0.12345"
        }
      },
      { status: 402 }
    );
  }

  // Simulate failure rate: if chaos is true, ALWAYS fail. Otherwise, 10% chance to fail naturally.
  if (service === "HyperRender8K" && (chaos || Math.random() < 0.1)) {
    return NextResponse.json({ error: "Internal Server Error: GPU Cluster Overload" }, { status: 500 });
  }

  try {
    const { ImageEngine } = await import("@/server/services/imageEngine");
    const engine = new ImageEngine();
    console.log(`[Merchant Provider] 💸 Payment verified (Receipt: ${receipt}). Generating image...`);
    const imgResult = await engine.generateImage({ prompt });
    return NextResponse.json({
      success: true,
      imageUrl: imgResult.imageUrl,
      dimensions: imgResult.dimensions,
      generationTimeMs: imgResult.generationTimeMs,
      provider: service || "x402 Provider"
    });
  } catch (err: any) {
    console.error("[Merchant Provider] Image generation failed:", err.message);
    return NextResponse.json({ error: "Asset synthesis failed: " + err.message }, { status: 500 });
  }
}
