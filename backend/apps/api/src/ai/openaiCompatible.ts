import { ProviderRequestError } from "./errors.js";
import type { SafetyResult, ToolDefinition } from "./types.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      refusal?: string;
      tool_calls?: Array<{
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
    failed_generation?: string;
  };
};

export type OpenAiCompatibleToolResult = {
  arguments: unknown;
  safety: SafetyResult;
};

export type OpenAiCompatibleJsonResult = {
  arguments: unknown;
  safety: SafetyResult;
};

export async function callOpenAiCompatibleChat(args: {
  providerName: string;
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  headers?: Record<string, string>;
}) {
  const messages: ChatMessage[] = [];

  if (args.systemPrompt) {
    messages.push({ role: "system", content: args.systemPrompt });
  }

  messages.push({ role: "user", content: args.prompt });

  const response = await fetchWithTimeout(args.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
      ...args.headers
    },
    body: JSON.stringify({
      model: args.model,
      messages,
      temperature: args.temperature ?? 0.7,
      max_tokens: 1800
    })
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    throw new ProviderRequestError(
      args.providerName,
      data.error?.message ?? response.statusText,
      response.status
    );
  }

  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new ProviderRequestError(args.providerName, "empty response text", response.status);
  }

  return text;
}

export async function callOpenAiCompatibleTool(args: {
  providerName: string;
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  tool: ToolDefinition;
  temperature?: number;
  headers?: Record<string, string>;
}): Promise<OpenAiCompatibleToolResult> {
  const response = await fetchWithTimeout(args.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
      ...args.headers
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.prompt }
      ],
      temperature: args.temperature ?? 0.7,
      tools: [
        {
          type: "function",
          function: {
            name: args.tool.name,
            description: args.tool.description,
            parameters: args.tool.parameters
          }
        }
      ],
      tool_choice: { type: "function", function: { name: args.tool.name } },
      parallel_tool_calls: false,
      max_tokens: 1800
    })
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    // Groq returns a 400 with code "tool_use_failed" when the model's tool call
    // doesn't match the schema. The partial generation is in failed_generation.
    // Extract and parse it so our validation/retry logic can handle it.
    if (data.error?.code === "tool_use_failed" && data.error?.failed_generation) {
      const partialArgs = extractToolCallArguments(data.error.failed_generation);
      if (partialArgs) {
        return {
          arguments: partialArgs,
          safety: { status: "passed", finishReason: "tool_calls" }
        };
      }
    }

    throw new ProviderRequestError(args.providerName, data.error?.message ?? response.statusText, response.status);
  }

  const choice = data.choices?.[0];
  const message = choice?.message;
  const finishReason = choice?.finish_reason;

  if (message?.refusal) {
    return {
      arguments: null,
      safety: { status: "refused", reason: message.refusal, finishReason }
    };
  }

  const toolCall = message?.tool_calls?.find((call) => call.function?.name === args.tool.name);
  if (!toolCall?.function?.arguments) {
    return {
      arguments: null,
      safety: {
        status: "blocked",
        reason: "The model did not return the required structured result.",
        finishReason
      }
    };
  }

  try {
    return {
      arguments: JSON.parse(toolCall.function.arguments),
      safety: { status: "passed", finishReason }
    };
  } catch {
    return {
      arguments: null,
      safety: {
        status: "blocked",
        reason: "The model returned invalid tool arguments.",
        finishReason
      }
    };
  }
}

export async function callOpenAiCompatibleJson(args: {
  providerName: string;
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  tool: ToolDefinition;
  temperature?: number;
  headers?: Record<string, string>;
}): Promise<OpenAiCompatibleJsonResult> {
  const response = await fetchWithTimeout(args.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
      ...args.headers
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        {
          role: "system",
          content: [
            args.systemPrompt,
            "",
            "Return only one JSON object. Do not include markdown, prose, or tool-call wrappers.",
            `The JSON object must match this schema for ${args.tool.name}:`,
            JSON.stringify(args.tool.parameters)
          ].join("\n")
        },
        { role: "user", content: args.prompt }
      ],
      temperature: args.temperature ?? 0.7,
      response_format: { type: "json_object" },
      max_tokens: 1800
    })
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    if (data.error?.failed_generation) {
      const partialArgs = extractJsonObject(data.error.failed_generation);
      if (partialArgs) {
        return {
          arguments: partialArgs,
          safety: { status: "passed", finishReason: data.error.code ?? data.error.type }
        };
      }
    }

    throw new ProviderRequestError(args.providerName, data.error?.message ?? response.statusText, response.status);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return {
      arguments: null,
      safety: {
        status: "blocked",
        reason: "The model did not return the required JSON result.",
        finishReason: data.choices?.[0]?.finish_reason
      }
    };
  }

  try {
    const parsed = extractJsonObject(content);
    if (!parsed) {
      throw new Error("invalid json");
    }

    return {
      arguments: parsed,
      safety: { status: "passed", finishReason: data.choices?.[0]?.finish_reason }
    };
  } catch {
    return {
      arguments: null,
      safety: {
        status: "blocked",
        reason: "The model returned invalid JSON.",
        finishReason: data.choices?.[0]?.finish_reason
      }
    };
  }
}

/**
 * Extract JSON arguments from Groq's failed_generation format.
 * Groq wraps the tool call as: <function=submit_genesis>{"key":"value",...}</function>
 */
function extractToolCallArguments(failedGeneration: string): unknown {
  // Strip the <function=...> and </function> wrapper
  const match = failedGeneration.match(/<function=[^>]+>([\s\S]*)<\/function>/);
  const jsonStr = match ? match[1].trim() : failedGeneration.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(input: string | URL, init: RequestInit, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderRequestError("AI provider", `request timed out after ${timeoutMs}ms`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ?? text;
  const trimmed = candidate.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
