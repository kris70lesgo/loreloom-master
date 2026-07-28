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
  };
};

export type OpenAiCompatibleToolResult = {
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

  const response = await fetch(args.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
      ...args.headers
    },
    body: JSON.stringify({
      model: args.model,
      messages,
      temperature: args.temperature ?? 0.7
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
  const response = await fetch(args.endpoint, {
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
      parallel_tool_calls: false
    })
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
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
