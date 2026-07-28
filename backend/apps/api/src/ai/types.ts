import type { AiProvider } from "../config.js";

export type GenerateInput = {
  provider: AiProvider;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
};

export type GenerateOutput = {
  provider: AiProvider;
  model: string;
  text: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type StructuredGenerateInput = {
  provider: AiProvider;
  prompt: string;
  systemPrompt: string;
  tool: ToolDefinition;
  temperature?: number;
  allowNvidiaFallback?: boolean;
};

export type SafetyResult = {
  status: "passed" | "blocked" | "refused";
  reason?: string;
  finishReason?: string;
};

export type StructuredGenerateOutput = {
  provider: AiProvider;
  model: string;
  arguments: unknown;
  safety: SafetyResult;
};

export type ProviderStatus = {
  provider: AiProvider;
  configured: boolean;
  model: string;
};
