export class ProviderSetupError extends Error {
  constructor(provider: string, envName: string) {
    super(`${provider} is not configured. Add ${envName} to your .env file.`);
    this.name = "ProviderSetupError";
  }
}

export class ProviderRequestError extends Error {
  status?: number;

  constructor(provider: string, message: string, status?: number) {
    super(`${provider} request failed: ${message}`);
    this.name = "ProviderRequestError";
    this.status = status;
  }
}

export class AiBlockedError extends Error {
  constructor(message: string, public readonly safety: { reason?: string; finishReason?: string } = {}) {
    super(message);
    this.name = "AiBlockedError";
  }
}

export class StructuredOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

export class MintPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MintPendingError";
  }
}
