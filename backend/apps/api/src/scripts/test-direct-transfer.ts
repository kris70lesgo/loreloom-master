import { Client, TransferTransaction, Hbar, PrivateKey, AccountId } from "@hashgraph/sdk";

async function run() {
  const accountIdStr = "0.0.9841005";
  const keyStr = "3030020100300706052b8104000a042204206a142feb86d7e93f5ec133c3bf685c306fdbd9217b746dd5f11c877ca97bc936";
  const payTo = "0.0.98765";
  const hbarAmount = 0.05;

  console.log(`Testing direct transfer of ${hbarAmount} HBAR from ${accountIdStr} to ${payTo}...`);
  const client = Client.forTestnet();
  const myAccountId = AccountId.fromString(accountIdStr);
  const myPrivateKey = PrivateKey.fromString(keyStr);
  client.setOperator(myAccountId, myPrivateKey);

  try {
    const tx = new TransferTransaction()
      .addHbarTransfer(myAccountId, new Hbar(-hbarAmount))
      .addHbarTransfer(AccountId.fromString(payTo), new Hbar(hbarAmount))
      .freezeWith(client);

    const signedTx = await tx.sign(myPrivateKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);
    console.log("Success! Transaction Receipt status:", receipt.status.toString());
    console.log("Transaction ID:", response.transactionId.toString());
  } catch (err: any) {
    console.error("Direct transfer failed:", err.message, err.stack);
  }
}

run();
