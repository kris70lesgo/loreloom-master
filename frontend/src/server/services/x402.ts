import { config } from "@/server/config";
import crypto from "node:crypto";

export interface X402Challenge {
  status: 402;
  message: string;
  payment_address: string;
  amount_hbar: number;
  nonce: string;
}

export interface PaymentReceipt {
  status: "confirmed" | "failed";
  tx_hash: string;
  hashscan_url: string;
  amount_paid: number;
  provider_address: string;
}

export class X402Error extends Error {
  challenge: X402Challenge;
  
  constructor(challenge: X402Challenge) {
    super(challenge.message);
    this.name = "X402Error";
    this.challenge = challenge;
  }
}

export async function simulateProviderEndpoint(providerAddress: string, amount: number, requirePayment: boolean = true) {
  if (requirePayment) {
    throw new X402Error({
      status: 402,
      message: "Payment Required",
      payment_address: providerAddress,
      amount_hbar: amount,
      nonce: crypto.randomBytes(16).toString("hex")
    });
  }
}

export async function processX402Payment(challenge: X402Challenge): Promise<PaymentReceipt> {
  // Simulate network latency for payment processing
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (!config.procurement.mockX402) {
    // In a real implementation, you would trigger Thirdweb/Hedera SDK calls here
    console.log(`[REAL X402] Paying ${challenge.amount_hbar} HBAR to ${challenge.payment_address}`);
  } else {
    console.log(`[MOCK X402] Paying ${challenge.amount_hbar} HBAR to ${challenge.payment_address}`);
  }

  // Generate a mock Hedera transaction hash
  const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const hederaHashscanUrl = `${config.procurement.hederaHashscanUrl}/${txHash}`;

  return {
    status: "confirmed",
    tx_hash: txHash,
    hashscan_url: hederaHashscanUrl,
    amount_paid: challenge.amount_hbar,
    provider_address: challenge.payment_address
  };
}
