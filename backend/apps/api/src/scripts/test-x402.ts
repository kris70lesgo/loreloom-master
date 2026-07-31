import { fetchWithx402 } from "../utils/x402Client.js";

async function run() {
  console.log("==========================================");
  console.log("🚀 Starting x402 Interceptor Test...");
  console.log("==========================================");
  try {
    const res = await fetchWithx402("http://localhost:4000/test-402-provider");
    const data = await res.json();
    console.log("==========================================");
    console.log("🎯 Final Response from Provider:", data);
    console.log("==========================================");
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

run();
