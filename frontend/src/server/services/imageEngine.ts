import fs from "fs";
import path from "path";
import { config } from "@/server/config";
import { randomUUID } from "crypto";

export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  productionId?: string;
  providerUrl?: string; // e.g. https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl: string;
  dimensions: string;
  providerName: string;
  generationTimeMs: number;
}

export class ImageEngine {
  /**
   * Generates an image by calling the standard image inference endpoint.
   */
  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now();
    const productionId = req.productionId || randomUUID();
    
    const width = req.width || 1024;
    const height = req.height || 1024;

    // By default or if using huggingface, use Pollinations since HF is DNS blocked in some environments
    let endpoint = req.providerUrl;
    let isPollinations = false;

    if (!endpoint || endpoint.includes("huggingface.co")) {
      endpoint = `https://image.pollinations.ai/prompt/${encodeURIComponent(req.prompt)}?width=${width}&height=${height}&nologo=true`;
      isPollinations = true;
    }

    const bodyPayload = {
      inputs: req.prompt,
      parameters: {
        width,
        height,
        num_inference_steps: req.num_inference_steps || 4,
      }
    };

    console.log(`[ImageEngine] 🎨 Generating image for prompt: "${req.prompt}"...`);
    console.log(`[ImageEngine] 🔗 Endpoint: ${endpoint}`);

    const headers: Record<string, string> = {
      "Accept": "image/*"
    };

    if (!isPollinations) {
      headers["Content-Type"] = "application/json";
      if (process.env.HF_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.HF_TOKEN}`;
      }
    }

    try {
      let response;
      if (isPollinations) {
        response = await fetch(endpoint, { method: "GET", headers });
      } else {
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload)
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Provider returned ${response.status}: ${errText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      const mimeType = isPollinations ? 'image/jpeg' : 'image/png';
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      // Save locally to public/outputs/{productionId}.png for debugging
      const publicDir = path.join(process.cwd(), "public", "outputs");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const filename = `${productionId}.png`;
      const filepath = path.join(publicDir, filename);
      fs.writeFileSync(filepath, buffer);

      const generationTimeMs = Date.now() - startTime;
      
      console.log(`[ImageEngine] ✅ Image successfully saved to ${filepath} in ${generationTimeMs}ms`);

      return {
        success: true,
        imageUrl: dataUri,
        dimensions: `${width}x${height}`,
        providerName: isPollinations ? "Pollinations AI (FLUX)" : "Hugging Face Inference",
        generationTimeMs
      };
    } catch (error: any) {
      console.error(`[ImageEngine] ❌ Failed to generate image:`, error.message);
      throw error;
    }
  }
}
