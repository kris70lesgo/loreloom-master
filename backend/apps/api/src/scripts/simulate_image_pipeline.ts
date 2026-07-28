import { createHash } from "node:crypto";

const API_URL = "http://localhost:4000";
const WALLET = "0x1234567890abcdef1234567890abcdef12345678";

function log(label: string, data: unknown) {
  console.log(`\n── ${label} ──`);
  console.log(JSON.stringify(data, null, 2));
}

async function simulate() {
  const narrativeContext =
    "Kaito Vance stood at the precipice of the Obsidian Spire, " +
    "the neon glow of Neo-Tokyo bleeding through the acid rain. " +
    "Before him, a holographic serpent coiled around the data core, " +
    "its scales refracting fragments of deleted memories.";

  const styleLock = "cyberpunk, neon noir, rain-slicked";
  const aspectRatio = "16:9";

  log("Narrative Payload", { narrativeContext, styleLock, aspectRatio });

  // 1. Create world
  log("Step 1: Create World", {});
  const createRes = await fetch(`${API_URL}/api/worlds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: WALLET,
      title: "Sim Image Test",
      intake: {
        prompt: narrativeContext,
        style: "cyberpunk",
        tone: "dark"
      }
    })
  });
  const created = await createRes.json();
  log("World created", {
    worldId: created.world?.id,
    jobId: created.job?.id,
    status: created.job?.status,
    provider: created.job?.payload?.provider
  });

  const worldId = created.world?.id;
  if (!worldId) {
    console.error("Failed to create world");
    return;
  }

  // 2. Wait for genesis + portrait jobs to complete
  await waitForJobs(worldId);

  // 3. Confirm world (set to locked, trigger mint)
  log("Step 3: Confirm World", {});
  const confirmRes = await fetch(`${API_URL}/api/worlds/${worldId}/confirm`, {
    method: "POST"
  });
  const confirmed = await confirmRes.json();
  log("World confirmed", { status: confirmed.world?.status });

  // 4. Create a chapter
  log("Step 4: Create Chapter", {});
  const chapterRes = await fetch(`${API_URL}/api/worlds/${worldId}/chapters`, {
    method: "POST"
  });
  const chapterCreated = await chapterRes.json();
  log("Chapter created", {
    chapterId: chapterCreated.chapter?.id,
    index: chapterCreated.chapter?.chapter_index,
    jobId: chapterCreated.job?.id,
    status: chapterCreated.job?.status
  });

  const chapterId = chapterCreated.chapter?.id;
  if (!chapterId) {
    console.error("Failed to create chapter");
    return;
  }

  // 5. Wait for chapter generate job
  await waitForJobs(worldId);

  // 6. Regenerate chapter image WITH narrative params
  log("Step 5: Regenerate Image with Narrative Params", {});
  const imgRes = await fetch(`${API_URL}/api/worlds/${worldId}/chapters/${chapterId}/regenerate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      narrativeContext,
      styleLock,
      aspectRatio
    })
  });
  const imgResult = await imgRes.json();
  log("Regenerate image response", {
    statusCode: imgRes.status,
    jobType: imgResult.job?.job_type,
    jobStatus: imgResult.job?.status,
    payload: imgResult.job?.payload
  });

  // 7. Verify job payload contains narrative params
  log("Step 6: Verify Job Payload", {});
  const jobRes = await fetch(`${API_URL}/api/jobs/${imgResult.job?.id}`);
  const jobData = await jobRes.json();
  log("Job detail", {
    jobId: jobData.job?.id,
    jobType: jobData.job?.job_type,
    payload: jobData.job?.payload,
    hasNarrativeContext: !!jobData.job?.payload?.narrativeContext,
    hasStyleLock: !!jobData.job?.payload?.styleLock,
    hasAspectRatio: !!jobData.job?.payload?.aspectRatio
  });

  // 8. Final result summary
  log("SIMULATION COMPLETE", {
    worldId,
    chapterId,
    narrativeParamsSent: { narrativeContext: narrativeContext.slice(0, 60) + "...", styleLock, aspectRatio },
    jobPayloadReceived: jobData.job?.payload,
    status: "success"
  });
}

async function waitForJobs(worldId: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${API_URL}/api/worlds/${worldId}`);
    const data = await res.json();
    const world = data.world;
    if (world.status === "portrait_ready" || world.status === "locked" || world.status === "active") {
      log(`World reached status: ${world.status}`, {});
      return;
    }
    if (world.status === "draft") {
      // still processing genesis, keep waiting
    }
    await sleep(3000);
  }
  console.warn("Timeout waiting for world jobs to complete");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

simulate().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
