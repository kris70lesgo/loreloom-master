import { config } from "../config.js";

export type EngineTransactionStatus = "queued" | "sent" | "mined" | "errored" | "cancelled" | "unknown";

export type EngineWriteResult = {
  queueId: string;
};

export type EngineTransaction = {
  status: EngineTransactionStatus;
  transactionHash?: string;
  errorMessage?: string;
};

type EnginePayload = {
  result?: unknown;
  error?: string | { message?: string };
};

type EngineConfig =
  | {
      mode: "v2";
      url: string;
      walletAddress: string;
      headers: Record<string, string>;
    }
  | {
      mode: "v3";
      url: string;
      walletAddress: string;
      headers: Record<string, string>;
    };

export async function submitContractWrite(input: {
  contractAddress: string;
  functionName: string;
  args: Array<string | number>;
  idempotencyKey: string;
}): Promise<EngineWriteResult> {
  const engine = getEngineConfig();
  if (engine.mode === "v3") {
    return submitTransactionsWrite(engine, input);
  }

  const response = await fetch(
    `${engine.url}/contract/${config.mint.chainId}/${input.contractAddress}/write?simulateTx=true`,
    {
      method: "POST",
      headers: {
        ...engine.headers,
        "content-type": "application/json",
        "x-backend-wallet-address": engine.walletAddress,
        "x-idempotency-key": input.idempotencyKey
      },
      body: JSON.stringify({ functionName: input.functionName, args: input.args })
    }
  );
  const payload = (await readJson(response)) as EnginePayload;
  const queueId = extractQueueId(payload.result);

  if (!response.ok || !queueId) {
    throw new Error(`thirdweb Engine write failed (${response.status}): ${engineError(payload)}`);
  }

  return { queueId };
}

export async function getEngineTransaction(queueId: string): Promise<EngineTransaction> {
  const engine = getEngineConfig();
  if (engine.mode === "v3") {
    return getTransactionsStatus(engine, queueId);
  }

  const response = await fetch(`${engine.url}/transaction/status/${encodeURIComponent(queueId)}`, {
    headers: engine.headers
  });
  const payload = (await readJson(response)) as EnginePayload;

  if (!response.ok) {
    throw new Error(`thirdweb Engine status failed (${response.status}): ${engineError(payload)}`);
  }

  return normalizeEngineTransaction(payload.result);
}

export function normalizeEngineTransaction(value: unknown): EngineTransaction {
  const raw = unwrapObject(value);
  const statusValue = typeof raw.status === "string" ? raw.status.toLowerCase() : "unknown";
  const status = normalizeStatus(statusValue);
  const transactionHash = firstString(raw.transactionHash, raw.transaction_hash, raw.txHash, raw.tx_hash);
  const errorMessage = firstString(raw.errorMessage, raw.error_message, raw.error);
  return { status, transactionHash, errorMessage };
}

function getEngineConfig(): EngineConfig {
  const transactionsSecretKey = config.mint.thirdwebSecretKey;
  const vaultAccessToken = config.mint.thirdwebVaultAccessToken;
  const transactionsWalletAddress = config.mint.thirdwebBackendWalletAddress ?? config.mint.deployerAddress;

  if (config.mint.mode === "thirdweb-transactions") {
    if (!transactionsSecretKey || !transactionsWalletAddress) {
      throw new Error(
        "thirdweb Transactions is not configured. Set THIRDWEB_SECRET_KEY and THIRDWEB_BACKEND_WALLET_ADDRESS."
      );
    }

    const headers: Record<string, string> = {
      "x-secret-key": transactionsSecretKey
    };
    if (vaultAccessToken) {
      headers["x-vault-access-token"] = vaultAccessToken;
    }

    return {
      mode: "v3",
      url: config.mint.thirdwebTransactionsUrl.replace(/\/$/, ""),
      walletAddress: transactionsWalletAddress,
      headers
    };
  }

  const url = config.mint.thirdwebEngineUrl?.replace(/\/$/, "");
  const accessToken = config.mint.thirdwebEngineAccessToken;
  const walletAddress = config.mint.thirdwebBackendWalletAddress;
  if (!url || !accessToken || !walletAddress) {
    throw new Error(
      "thirdweb Engine is not configured. Set THIRDWEB_ENGINE_URL, THIRDWEB_ENGINE_ACCESS_TOKEN, and THIRDWEB_BACKEND_WALLET_ADDRESS."
    );
  }

  return {
    mode: "v2",
    url,
    walletAddress,
    headers: { authorization: `Bearer ${accessToken}` }
  };
}

async function submitTransactionsWrite(
  engine: Extract<EngineConfig, { mode: "v3" }>,
  input: Parameters<typeof submitContractWrite>[0]
): Promise<EngineWriteResult> {
  const response = await fetch(`${engine.url}/v1/write/contract`, {
    method: "POST",
    headers: {
      ...engine.headers,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      executionOptions: {
        type: "EOA",
        chainId: config.mint.chainId,
        from: engine.walletAddress,
        idempotencyKey: input.idempotencyKey
      },
      params: [
        {
          contractAddress: input.contractAddress,
          method: methodSignature(input.functionName),
          params: input.args
        }
      ]
    })
  });
  const payload = (await readJson(response)) as EnginePayload;
  const queueId = extractTransactionsQueueId(payload.result);

  if (!response.ok || !queueId) {
    throw new Error(`thirdweb Transactions write failed (${response.status}): ${engineError(payload)}`);
  }

  return { queueId };
}

async function getTransactionsStatus(
  engine: Extract<EngineConfig, { mode: "v3" }>,
  queueId: string
): Promise<EngineTransaction> {
  const response = await fetch(`${engine.url}/v1/transactions/search`, {
    method: "POST",
    headers: {
      ...engine.headers,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      page: 1,
      limit: 1,
      filters: [
        {
          field: "id",
          values: [queueId],
          operation: "OR"
        }
      ],
      sortBy: "createdAt",
      sortDirection: "desc"
    })
  });
  const payload = (await readJson(response)) as EnginePayload;

  if (!response.ok) {
    throw new Error(`thirdweb Transactions status failed (${response.status}): ${engineError(payload)}`);
  }

  const transactions = unwrapObject(payload.result).transactions;
  const transaction = Array.isArray(transactions) ? transactions[0] : undefined;
  return transaction ? normalizeEngineTransaction(transaction) : { status: "unknown" };
}

function extractQueueId(result: unknown) {
  if (typeof result === "string") return result;
  const raw = unwrapObject(result);
  return firstString(raw.queueId, raw.queue_id, raw.id);
}

function extractTransactionsQueueId(result: unknown) {
  const raw = unwrapObject(result);
  const transactions = raw.transactions;
  if (Array.isArray(transactions)) {
    const first = unwrapObject(transactions[0]);
    return firstString(first.id, first.queueId, first.queue_id);
  }
  return extractQueueId(result);
}

function normalizeStatus(statusValue: string): EngineTransactionStatus {
  switch (statusValue) {
    case "queued":
      return "queued";
    case "sent":
    case "submitted":
      return "sent";
    case "mined":
    case "confirmed":
      return "mined";
    case "errored":
    case "failed":
      return "errored";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "unknown";
  }
}

function methodSignature(functionName: string) {
  switch (functionName) {
    case "mint":
      return "mint(address,string)";
    case "mintChapter":
      return "mintChapter(address,uint256,string)";
    default:
      return functionName;
  }
}

function unwrapObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return unwrapObject(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

function engineError(payload: EnginePayload) {
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.error?.message === "string") return payload.error.message;
  return JSON.stringify(payload);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}
