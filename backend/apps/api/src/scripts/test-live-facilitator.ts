import { Client, TransferTransaction, Hbar, PrivateKey, AccountId, TransactionId } from "@hashgraph/sdk";
import { config } from "../config.js";

async function run() {
  const accountIdStr = "0.0.9841005";
  const keyStr = "3030020100300706052b8104000a042204206a142feb86d7e93f5ec133c3bf685c306fdbd9217b746dd5f11c877ca97bc936";
  const payTo = "0.0.98765";
  const tinybarAmount = "5000000"; // 0.05 HBAR
  
  // The facilitator account ID found in /supported signers
  const facilitatorAccountIdStr = "0.0.7162784";
  
  console.log("Creating live TransferTransaction with facilitator as fee payer...");
  const client = Client.forTestnet();
  const myAccountId = AccountId.fromString(accountIdStr);
  const myPrivateKey = PrivateKey.fromString(keyStr);
  
  // Set operator so we have node list, but we manually build transaction ID with the facilitator account
  client.setOperator(myAccountId, myPrivateKey);

  const hbarAmount = Number(tinybarAmount) / 100_000_000;
  const recipientId = AccountId.fromString(payTo);
  const facilitatorId = AccountId.fromString(facilitatorAccountIdStr);

  // Generate a transaction ID where the fee payer is the facilitator!
  const txId = TransactionId.generate(facilitatorId);

  const tx = new TransferTransaction()
    .setTransactionId(txId)
    .addHbarTransfer(myAccountId, new Hbar(-hbarAmount))
    .addHbarTransfer(recipientId, new Hbar(hbarAmount))
    .freezeWith(client);

  const signedTx = await tx.sign(myPrivateKey);
  const transactionBytes = Buffer.from(signedTx.toBytes()).toString("base64");
  
  const v2Requirements = {
    network: "hedera:testnet",
    scheme: "exact",
    maxAmountRequired: tinybarAmount,
    amount: tinybarAmount,
    resource: "http://localhost:4000/test-402-provider?cost=0.05&chaos=false",
    description: "LoreLoom AI Asset",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 300,
    asset: "HBAR",
    extra: { name: "HBAR", version: "1" }
  };

  const v2PaymentPayload = {
    x402Version: 2,
    scheme: "exact",
    network: "hedera:testnet",
    payload: {
      transactionBytes,
      signerAccountId: accountIdStr,
      amount: tinybarAmount
    }
  };

  const facilitatorBody = {
    x402Version: 2,
    paymentRequirements: v2Requirements,
    paymentPayload: v2PaymentPayload
  };

  console.log("Submitting to blocky402 verify endpoint...");
  const verifyRes = await fetch("https://api.testnet.blocky402.com/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(facilitatorBody)
  });

  console.log("Status:", verifyRes.status);
  const text = await verifyRes.text();
  console.log("Response text:", text);
}

run().catch(console.error);
