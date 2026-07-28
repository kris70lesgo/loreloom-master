import { config, type AiProvider } from "../config.js";
import { AiBlockedError, ProviderRequestError, ProviderSetupError } from "./errors.js";
import { callOpenAiCompatibleChat, callOpenAiCompatibleTool } from "./openaiCompatible.js";
import type {
  GenerateInput,
  GenerateOutput,
  ProviderStatus,
  StructuredGenerateInput,
  StructuredGenerateOutput,
  ToolDefinition
} from "./types.js";

type GeminiResponse = {
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  candidates?: Array<{
    finishReason?: string;
    safetyRatings?: Array<{
      category?: string;
      probability?: string;
      blocked?: boolean;
    }>;
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: {
          name?: string;
          args?: unknown;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      provider: "openrouter",
      configured: Boolean(config.openrouter.apiKey),
      model: config.openrouter.model
    },
    {
      provider: "gemini",
      configured: Boolean(config.gemini.apiKey),
      model: config.gemini.model
    },
    {
      provider: "nvidia",
      configured: Boolean(config.nvidia.apiKey),
      model: config.nvidia.model
    }
  ];
}

export async function generateText(input: GenerateInput): Promise<GenerateOutput> {
  switch (input.provider) {
    case "openrouter":
      return {
        provider: "openrouter",
        model: config.openrouter.model,
        text: await generateWithOpenRouter(input)
      };
    case "gemini":
      return {
        provider: "gemini",
        model: config.gemini.model,
        text: await generateWithGemini(input)
      };
    case "nvidia":
      return {
        provider: "nvidia",
        model: config.nvidia.model,
        text: await generateWithNvidia(input)
      };
    default:
      return assertNever(input.provider);
  }
}

export async function generateStructured(input: StructuredGenerateInput): Promise<StructuredGenerateOutput> {
  try {
    return await generateStructuredWithProvider(input.provider, input);
  } catch (error) {
    if (
      input.allowNvidiaFallback &&
      input.provider === "gemini" &&
      error instanceof ProviderRequestError &&
      isTransientProviderError(error)
    ) {
      console.warn("[text] Gemini transient failure, falling back to OpenRouter instead of NVIDIA due to NVIDIA outage...");
      return generateStructuredWithProvider("openrouter", { ...input, provider: "openrouter", allowNvidiaFallback: false });
    }

    throw error;
  }
}

async function generateWithOpenRouter(input: GenerateInput) {
  if (!config.openrouter.apiKey) {
    throw new ProviderSetupError("OpenRouter", "OPENROUTER_API_KEY");
  }

  return callOpenAiCompatibleChat({
    providerName: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: config.openrouter.apiKey,
    model: config.openrouter.model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    temperature: input.temperature,
    headers: {
      "HTTP-Referer": config.openrouter.appUrl,
      "X-Title": config.openrouter.appName
    }
  });
}

async function generateWithGemini(input: GenerateInput) {
  if (!config.gemini.apiKey) {
    throw new ProviderSetupError("Gemini", "GEMINI_API_KEY");
  }

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent`
  );
  url.searchParams.set("key", config.gemini.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: input.systemPrompt
        ? {
            parts: [{ text: input.systemPrompt }]
          }
        : undefined,
      contents: [
        {
          role: "user",
          parts: [{ text: input.prompt }]
        }
      ],
      generationConfig: {
        temperature: input.temperature ?? 0.7
      }
    })
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    throw new ProviderRequestError("Gemini", data.error?.message ?? response.statusText, response.status);
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    throw new ProviderRequestError("Gemini", "empty response text", response.status);
  }

  return text;
}

async function generateStructuredWithProvider(
  provider: AiProvider,
  input: StructuredGenerateInput
): Promise<StructuredGenerateOutput> {
  switch (provider) {
    case "gemini":
      return generateGeminiTool(input);
    case "openrouter":
      return generateOpenRouterTool(input);
    case "nvidia":
      return generateNvidiaTool(input);
    default:
      return assertNever(provider);
  }
}

function sanitizeSchemaForGemini(schema: any): any {
  if (schema === null || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(sanitizeSchemaForGemini);
  }
  const sanitized: any = {};
  for (const key of Object.keys(schema)) {
    if (key === "additionalProperties") {
      continue;
    }
    sanitized[key] = sanitizeSchemaForGemini(schema[key]);
  }
  return sanitized;
}

async function generateGeminiTool(input: StructuredGenerateInput): Promise<StructuredGenerateOutput> {
  if (!config.gemini.apiKey) {
    throw new ProviderSetupError("Gemini", "GEMINI_API_KEY");
  }

  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent`);
  url.searchParams.set("key", config.gemini.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: { temperature: input.temperature ?? 0.7 },
      tools: [
        {
          functionDeclarations: [
            {
              name: input.tool.name,
              description: input.tool.description,
              parameters: sanitizeSchemaForGemini(input.tool.parameters)
            }
          ]
        }
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [input.tool.name]
        }
      }
    })
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    throw new ProviderRequestError("Gemini", data.error?.message ?? response.statusText, response.status);
  }

  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const blockedRating = candidate?.safetyRatings?.find((rating) => rating.blocked);
  const promptBlock = data.promptFeedback?.blockReason;

  if (promptBlock || blockedRating || finishReason === "SAFETY") {
    throw new AiBlockedError("Gemini blocked this generation.", {
      reason: data.promptFeedback?.blockReasonMessage ?? promptBlock ?? blockedRating?.category,
      finishReason
    });
  }

  const functionCall = candidate?.content?.parts
    ?.map((part) => part.functionCall)
    .find((call) => call?.name === input.tool.name);

  if (!functionCall) {
    // Treat as a retriable provider error, not a permanent safety block —
    // this happens when Gemini returns text instead of a tool call (transient conformance failure).
    throw new ProviderRequestError("Gemini", `Did not return the required structured result (finishReason: ${finishReason})`, 500);
  }

  return {
    provider: "gemini",
    model: config.gemini.model,
    arguments: functionCall.args ?? {},
    safety: { status: "passed", finishReason }
  };
}

async function generateOpenRouterTool(input: StructuredGenerateInput): Promise<StructuredGenerateOutput> {
  if (!config.openrouter.apiKey) {
    throw new ProviderSetupError("OpenRouter", "OPENROUTER_API_KEY");
  }

  const result = await callOpenAiCompatibleTool({
    providerName: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: config.openrouter.apiKey,
    model: config.openrouter.model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    tool: input.tool,
    temperature: input.temperature,
    headers: { "HTTP-Referer": config.openrouter.appUrl, "X-Title": config.openrouter.appName }
  });

  if (result.safety.status !== "passed") {
    throw new AiBlockedError("OpenRouter blocked or refused this generation.", result.safety);
  }

  return { provider: "openrouter", model: config.openrouter.model, ...result };
}

async function generateNvidiaTool(input: StructuredGenerateInput): Promise<StructuredGenerateOutput> {
  if (!config.nvidia.apiKey) {
    throw new ProviderSetupError("NVIDIA", "NVIDIA_API_KEY");
  }

  const result = await callOpenAiCompatibleTool({
    providerName: "NVIDIA",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: config.nvidia.apiKey,
    model: config.nvidia.model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    tool: input.tool,
    temperature: input.temperature
  });

  if (result.safety.status !== "passed") {
    throw new AiBlockedError("NVIDIA blocked or refused this generation.", result.safety);
  }

  return { provider: "nvidia", model: config.nvidia.model, ...result };
}

async function generateWithNvidia(input: GenerateInput) {
  if (!config.nvidia.apiKey) {
    throw new ProviderSetupError("NVIDIA", "NVIDIA_API_KEY");
  }

  return callOpenAiCompatibleChat({
    providerName: "NVIDIA",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: config.nvidia.apiKey,
    model: config.nvidia.model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    temperature: input.temperature
  });
}

function assertNever(value: never): never {
  throw new Error(`Unhandled AI provider: ${value}`);
}

function isTransientProviderError(error: ProviderRequestError) {
  return error.status === 408 || error.status === 409 || error.status === 429 || (error.status != null && error.status >= 500);
}

export function isAiProvider(value: string): value is AiProvider {
  return value === "openrouter" || value === "gemini" || value === "nvidia";
}
