import { config, type AiProvider } from "@/server/config";
import { AiBlockedError, ProviderRequestError, ProviderSetupError } from "@/server/ai/errors";
import { callOpenAiCompatibleChat, callOpenAiCompatibleTool } from "@/server/ai/openaiCompatible";
import type {
  GenerateInput,
  GenerateOutput,
  ProviderStatus,
  StructuredGenerateInput,
  StructuredGenerateOutput,
  ToolDefinition
} from "@/server/ai/types";



export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      provider: "openrouter",
      configured: Boolean(config.openrouter.apiKey),
      model: config.openrouter.model
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
  return generateStructuredWithProvider(input.provider, input);
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


async function generateStructuredWithProvider(
  provider: AiProvider,
  input: StructuredGenerateInput
): Promise<StructuredGenerateOutput> {
  switch (provider) {
    case "openrouter":
      return generateOpenRouterTool(input);
    case "nvidia":
      return generateNvidiaTool(input);
    default:
      return assertNever(provider);
  }
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
  return value === "openrouter" || value === "nvidia";
}
