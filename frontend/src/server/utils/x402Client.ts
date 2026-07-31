import { Client, TransferTransaction, Hbar, PrivateKey, AccountId } from "@hashgraph/sdk";
import { config } from "@/server/config";

export class x402PaymentError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "x402PaymentError";
    this.statusCode = statusCode;
  }
}

/**
 * Payment requirements sent by a 402 server response.
 * We handle both "simple" (our local mock) and "x402v2" (blocky402 compatible) formats.
 */
export interface PaymentRequirements {
  // Simple format (our local mock)
  amount?: number;
  asset?: string;
  payTo?: string;
  feePayer?: string;
  network?: string;
  // x402 v2 format (blocky402 compatible)
  maxAmountRequired?: string;
  resource?: string;
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  scheme?: string;
  extra?: Record<string, unknown>;
}

export interface SettlementResponse {
  success: boolean;
  transactionId: string;
}

const HBAR_TO_TINYBAR = 100_000_000;

/**
 * Convert HBAR amount to tinybar string (x402 v2 uses tinybar strings).
 * If amount is already > 1000 it's probably already in tinybar.
 */
function toTinybarString(hbarAmount: number): string {
  if (hbarAmount >= 1000) return Math.round(hbarAmount).toString();
  return Math.round(hbarAmount * HBAR_TO_TINYBAR).toString();
}

export async function fetchWithx402(url: string, options: RequestInit = {}): Promise<Response> {
  // First attempt — no payment header
  const response = await fetch(url, options);

  if (response.status !== 402) {
    return response;
  }

  console.log(`\n[x402 Interceptor] 🛑 Received 402 Payment Required from ${url}`);
  const body = await response.json();
  const requirements: PaymentRequirements = body.paymentRequirements || body;

  // Normalise to x402v2 fields regardless of which format the server used
  const payTo   = requirements.payTo   || "0.0.98765";
  const network = requirements.network  || "hedera:testnet";
  const asset   = requirements.asset   || "HBAR";

  // Prefer maxAmountRequired (x402v2), fall back to legacy `amount` field
  let tinybarAmount: string;
  if (requirements.maxAmountRequired) {
    tinybarAmount = requirements.maxAmountRequired;
  } else if (requirements.amount !== undefined) {
    tinybarAmount = toTinybarString(requirements.amount);
  } else {
    throw new x402PaymentError("No amount in payment requirements");
  }

  console.log(`[x402 Interceptor] 📝 Requirements: payTo=${payTo} amount=${tinybarAmount} tinybar network=${network}`);

  // Build the x402v2-compatible paymentRequirements object for the facilitator
  const v2Requirements = {
    network,
    scheme: requirements.scheme || "exact",
    maxAmountRequired: tinybarAmount,
    amount:            tinybarAmount,        // facilitator requires both
    resource:          requirements.resource || url,
    description:       requirements.description || "LoreLoom AI Asset",
    mimeType:          requirements.mimeType || "application/json",
    payTo,
    maxTimeoutSeconds: requirements.maxTimeoutSeconds || 300,
    asset,
    extra:             requirements.extra || { name: asset, version: "1" }
  };

  // ─────────────────────────────────────────────────────────────
  // Build the signed transaction bytes
  // ─────────────────────────────────────────────────────────────
  let transactionBytes: string;
  let signerAccountId: string;

  if (config.procurement.useLiveNetwork) {
    if (!config.procurement.hederaAccountId || !config.procurement.hederaPrivateKey) {
      throw new Error("Hedera credentials missing in environment variables.");
    }

    console.log(`[x402 Interceptor] 🔐 Building live Hedera TransferTransaction...`);
    
    const client = Client.forTestnet();
    const myAccountId = AccountId.fromString(config.procurement.hederaAccountId);
    const myPrivateKey = PrivateKey.fromStringECDSA(config.procurement.hederaPrivateKey);
    client.setOperator(myAccountId, myPrivateKey);

    const hbarAmount = Number(tinybarAmount) / HBAR_TO_TINYBAR;
    const recipientId = AccountId.fromString(payTo);

    const tx = new TransferTransaction()
      .addHbarTransfer(myAccountId, new Hbar(-hbarAmount))
      .addHbarTransfer(recipientId, new Hbar(hbarAmount))
      .freezeWith(client);

    const signedTx = await tx.sign(myPrivateKey);
    transactionBytes = Buffer.from(signedTx.toBytes()).toString("base64");
    signerAccountId  = config.procurement.hederaAccountId;

    console.log(`[x402 Interceptor] ✍️  Signed. Signer: ${signerAccountId}`);

  } else {
    // Mock for local development — local facilitator doesn't validate bytes
    transactionBytes = Buffer.from(`mock-tx-${Date.now()}`).toString("base64");
    signerAccountId  = "0.0.9841005";
  }

  // ─────────────────────────────────────────────────────────────
  // x402 v2 paymentPayload envelope (confirmed by probing blocky402.com)
  // Structure: { x402Version, scheme, network, payload: { transactionBytes, signerAccountId } }
  // ─────────────────────────────────────────────────────────────
  const v2PaymentPayload = {
    x402Version: 2,
    scheme: "exact",
    network,
    payload: {
      transactionBytes,
      signerAccountId,
      amount: tinybarAmount
    }
  };

  const facilitatorBody = {
    x402Version: 2,
    paymentRequirements: v2Requirements,
    paymentPayload: v2PaymentPayload
  };

  const facilitatorUrl = config.procurement.useLiveNetwork
    ? "https://api.testnet.blocky402.com"
    : `${config.baseUrl}/api/x402-facilitator`;

  // ── Submit / Verify / Settle ─────────────────────────────────
  let transactionId: string;

  try {
    console.log(`[x402 Interceptor] 💸 Submitting to facilitator: ${facilitatorUrl}`);
    console.log(`[x402 Interceptor] 📦 Body:`, JSON.stringify(facilitatorBody, null, 2));

    // ── /verify ──────────────────────────────────────────────────
    const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(facilitatorBody)
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      throw new Error(`Facilitator verification failed: ${verifyRes.status} - ${errText}`);
    }
    console.log(`[x402 Interceptor] ✅ Verified.`);

    // ── /settle ───────────────────────────────────────────────────
    const settleRes = await fetch(`${facilitatorUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(facilitatorBody)
    });

    if (!settleRes.ok) {
      const errText = await settleRes.text();
      throw new Error(`Facilitator settlement failed: ${settleRes.status} - ${errText}`);
    }

    const settlement: SettlementResponse = await settleRes.json();
    if (!settlement.success) {
      throw new Error("Payment settlement failed: server returned success=false");
    }

    transactionId = settlement.transactionId;
    console.log(`[x402 Interceptor] 🎉 Facilitator Settlement OK! TxID: ${transactionId}`);
  } catch (err: any) {
    console.warn(`[x402 Interceptor] ⚠️ Facilitator flow failed: ${err.message}`);

    if (config.procurement.useLiveNetwork) {
      console.log(`[x402 Interceptor] 🔄 Falling back to direct on-chain submission...`);
      
      const client = Client.forTestnet();
      const myAccountId = AccountId.fromString(config.procurement.hederaAccountId!);
      const myPrivateKey = PrivateKey.fromString(config.procurement.hederaPrivateKey!);
      client.setOperator(myAccountId, myPrivateKey);

      const hbarAmount = Number(tinybarAmount) / HBAR_TO_TINYBAR;
      const recipientId = AccountId.fromString(payTo);

      const tx = new TransferTransaction()
        .addHbarTransfer(myAccountId, new Hbar(-hbarAmount))
        .addHbarTransfer(recipientId, new Hbar(hbarAmount))
        .freezeWith(client);

      const signedTx = await tx.sign(myPrivateKey);
      const executionResponse = await signedTx.execute(client);
      const receipt = await executionResponse.getReceipt(client);

      if (receipt.status.toString() !== "SUCCESS") {
        throw new x402PaymentError("Direct on-chain transaction failed: " + receipt.status.toString());
      }

      transactionId = executionResponse.transactionId.toString();
      console.log(`[x402 Interceptor] ✅ Direct on-chain transfer succeeded! TxID: ${transactionId}`);
    } else {
      transactionId = `0.0.9841005@${Math.floor(Date.now() / 1000)}.${String(Date.now() % 1000).padStart(9, "0")}`;
      console.log(`[x402 Interceptor] ✅ Mock transaction generated: ${transactionId}`);
    }
  }

  console.log(`[x402 Interceptor] 🔄 Retrying original request with X-Payment-Receipt...\n`);

  const retryRes = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>),
      "X-Payment-Receipt": transactionId
    }
  });

  // Construct a new Response to attach the transactionId to the headers so calling function can read it
  const newHeaders = new Headers(retryRes.headers);
  newHeaders.set("X-Payment-Receipt", transactionId);
  newHeaders.set("X-Payment-Amount", tinybarAmount);

  return new Response(retryRes.body, {
    status: retryRes.status,
    statusText: retryRes.statusText,
    headers: newHeaders
  });
}
