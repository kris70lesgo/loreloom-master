import { NextResponse } from "next/server";
import { z } from "zod";
import { ProviderRequestError, ProviderSetupError } from "@/server/ai/errors";
import { generateText, isAiProvider } from "@/server/ai/providers";
import { errorResponse, validationError } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  provider: z.string().refine(isAiProvider, "Provider must be openrouter, gemini, or nvidia."),
  prompt: z.string().min(1, "Prompt is required."),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional()
});

export async function POST(request: Request) {
  const parsed = generateSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const result = await generateText(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProviderSetupError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ProviderRequestError) {
      const status = error.status && error.status >= 400 ? error.status : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    return errorResponse(error);
  }
}
