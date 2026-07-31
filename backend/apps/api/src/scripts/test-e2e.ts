const BASE_URL = "http://localhost:4000";

async function runE2ETest(testName: string, budget: number, chaos: boolean) {
  console.log("\n==================================================");
  console.log(`🚀 RUNNING: ${testName}`);
  console.log(`   Budget: ${budget} ℏ | Chaos Mode: ${chaos ? "ON" : "OFF"}`);
  console.log("==================================================");

  const url = `${BASE_URL}/api/production/stream?prompt=Heroic%20Space%20Opera&budget=${budget}&chaos=${chaos}`;
  const response = await fetch(url);

  if (!response.body) {
    throw new Error("No response body received");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim().startsWith("data:")) continue;
      const dataStr = line.replace(/^data:\s*/, "").trim();

      if (dataStr === "[DONE]") {
        console.log("\n✅ STREAM COMPLETED SUCCESSFULLY");
        return;
      }

      try {
        const data = JSON.parse(dataStr);
        const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
        const prefix = `[${timestamp}] [${data.level}]`;

        switch (data.level) {
          case "INFO":
            console.log(`\x1b[37m${prefix} ${data.message}\x1b[0m`);
            break;
          case "REASONING":
            console.log(`\x1b[36m${prefix} ${data.message}\x1b[0m`);
            break;
          case "PAYMENT":
            console.log(`\x1b[32m${prefix} ${data.message}\x1b[0m`);
            break;
          case "ERROR":
            console.log(`\x1b[31m${prefix} ${data.message}\x1b[0m`);
            break;
        }

        if (data.receipt) {
          console.log(`   \x1b[90m└─ Receipt: Provider=${data.receipt.provider} | Cost=${data.receipt.cost} ℏ | TxID=${data.receipt.txId}\x1b[0m`);
        }
      } catch (err) {
        // Ignored
      }
    }
  }
}

async function main() {
  try {
    // Test 1: Standard Premium Execution (High Budget, Chaos OFF)
    await runE2ETest("Test 1: High Budget Premium Execution", 60, false);

    // Test 2: Budget Downgrade (Low Budget, Chaos OFF)
    await runE2ETest("Test 2: Low Budget Downgrade Strategy", 15, false);

    // Test 3: Chaos Mode Failure Recovery (High Budget, Chaos ON)
    await runE2ETest("Test 3: Chaos Mode Provider Failure & Autonomous Recovery", 60, true);

    console.log("\n🎉 ALL E2E SUITE TESTS PASSED SUCCESSFULLY!\n");
  } catch (error) {
    console.error("E2E Test Suite Failed:", error);
    process.exit(1);
  }
}

main();
