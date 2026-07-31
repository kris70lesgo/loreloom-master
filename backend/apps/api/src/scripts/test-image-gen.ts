import { ImageEngine } from "../services/imageEngine.js";

async function runTest() {
  console.log("==========================================");
  console.log("🖼️ TESTING IMAGE GENERATION ENGINE");
  console.log("==========================================");

  const engine = new ImageEngine();

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    console.log(`[Mock Fetch] Intercepted request to ${url}`);
    
    // Return a dummy 1x1 transparent PNG buffer
    const dummyBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    
    return {
      ok: true,
      arrayBuffer: async () => dummyBuffer.buffer,
    } as any;
  };

  try {
    const result = await engine.generateImage({
      prompt: "A beautiful futuristic city skyline at sunset, neon lights, cyberpunk style, high quality, 4k",
      width: 512, // Using smaller size for faster generation on free tier
      height: 512,
      num_inference_steps: 2,
    });

    console.log("\n✅ Image Generation Successful!");
    console.log(JSON.stringify(result, null, 2));

  } catch (err: any) {
    console.error("\n❌ Image Generation Failed:");
    console.error(err.message);
    process.exit(1);
  }
}

runTest().catch(console.error);
