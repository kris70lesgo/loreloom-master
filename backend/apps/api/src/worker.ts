import { config } from "./config.js";
import { AiBlockedError } from "./ai/errors.js";
import { hasSupabaseAdminConfig } from "./db/supabase.js";
import { claimNextJob, markJobBlocked, markJobFailed } from "./services/jobs.js";
import { processJob } from "./workers/handlers.js";

let shouldStop = false;

process.on("SIGINT", () => {
  shouldStop = true;
});

process.on("SIGTERM", () => {
  shouldStop = true;
});

async function main() {
  if (!hasSupabaseAdminConfig()) {
    console.error("Worker cannot start: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exitCode = 1;
    return;
  }

  console.log(`Loreloom worker ${config.worker.id} started.`);

  while (!shouldStop) {
    try {
      const job = await claimNextJob(config.worker.id);

      if (!job) {
        await sleep(config.worker.idleSleepMs);
        continue;
      }

      console.log(`Processing ${job.job_type} job ${job.id}`);

      try {
        await processJob(job);
      } catch (error) {
        console.error(`Job ${job.id} failed`, error);
        if (error instanceof AiBlockedError) {
          await markJobBlocked(job, error);
        } else {
          await markJobFailed(job, error);
        }
      }
    } catch (error) {
      console.error("Worker error claiming or processing job (network/database connection issues):", error);
      await sleep(config.worker.pollIntervalMs || 2000);
    }
  }

  console.log("Loreloom worker stopped.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
