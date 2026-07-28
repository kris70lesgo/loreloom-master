import { Router } from "express";
import { z } from "zod";
import { ProviderRequestError, ProviderSetupError } from "../ai/errors.js";
import { generateText, getProviderStatuses, isAiProvider } from "../ai/providers.js";
import { asyncRoute } from "../http/asyncRoute.js";

const generateSchema = z.object({
  provider: z.string().refine(isAiProvider, "Provider must be openrouter, gemini, or nvidia."),
  prompt: z.string().min(1, "Prompt is required."),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional()
});

export const aiRouter = Router();

aiRouter.get("/providers", (_req, res) => {
  res.json({
    providers: getProviderStatuses()
  });
});

aiRouter.post(
  "/generate",
  asyncRoute(async (req, res) => {
    const parsed = generateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request.",
        details: parsed.error.flatten()
      });
      return;
    }

    try {
      const result = await generateText(parsed.data);
      res.json(result);
    } catch (error) {
      if (error instanceof ProviderSetupError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ProviderRequestError) {
        res.status(error.status && error.status >= 400 ? error.status : 502).json({
          error: error.message
        });
        return;
      }

      throw error;
    }
  })
);
