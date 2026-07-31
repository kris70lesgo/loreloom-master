import { getSupabaseAdmin } from "../db/supabase.js";
import type { GenerationJobRow, JobType, JsonValue } from "../db/types.js";
import { HttpError } from "../http/errors.js";

type EnqueueJobInput = {
  jobType: JobType;
  worldId?: string;
  chapterId?: string;
  payload?: JsonValue;
  runAt?: Date;
};

export async function enqueueJob(input: EnqueueJobInput): Promise<GenerationJobRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      job_type: input.jobType,
      world_id: input.worldId,
      chapter_id: input.chapterId,
      payload: input.payload ?? {},
      run_at: (input.runAt ?? new Date()).toISOString()
    })
    .select("id, world_id, chapter_id, job_type, status, payload, checkpoint, retry_count, max_retries, run_at, worker_id, error_message, created_at, updated_at, started_at, finished_at")
    .single();

  if (error || !data) {
    throw new HttpError(500, error?.message ?? "Could not enqueue job.");
  }

  return data as GenerationJobRow;
}

export async function enqueueJobIfMissing(input: EnqueueJobInput): Promise<GenerationJobRow> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("generation_jobs")
    .select("id, world_id, chapter_id, job_type, status, payload, checkpoint, retry_count, max_retries, run_at, worker_id, error_message, created_at, updated_at, started_at, finished_at")
    .eq("job_type", input.jobType)
    .in("status", ["queued", "retrying", "processing", "succeeded"]);

  if (input.worldId) {
    query = query.eq("world_id", input.worldId);
  }

  if (input.chapterId) {
    query = query.eq("chapter_id", input.chapterId);
  }

  const { data: existing, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (existing) {
    return existing as GenerationJobRow;
  }

  return enqueueJob(input);
}

export async function getJob(jobId: string): Promise<GenerationJobRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("generation_jobs").select("id, world_id, chapter_id, job_type, status, payload, checkpoint, retry_count, max_retries, run_at, worker_id, error_message, created_at, updated_at, started_at, finished_at").eq("id", jobId).single();

  if (error || !data) {
    throw new HttpError(error?.code === "PGRST116" ? 404 : 500, error?.message ?? "Job not found.");
  }

  return data as GenerationJobRow;
}

export async function claimNextJob(workerId: string): Promise<GenerationJobRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("claim_next_generation_job", {
    p_worker_id: workerId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as GenerationJobRow[] | null)?.[0] ?? null) as GenerationJobRow | null;
}

export async function updateJobCheckpoint(jobId: string, checkpoint: JsonValue) {
  const supabase = getSupabaseAdmin();
  const current = await getJob(jobId);
  const mergedCheckpoint = mergeJsonObjects(current.checkpoint, checkpoint);
  const { error } = await supabase.from("generation_jobs").update({ checkpoint: mergedCheckpoint }).eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markJobBlocked(job: GenerationJobRow, error: Error) {
  const supabase = getSupabaseAdmin();
  const checkpoint = mergeJsonObjects(job.checkpoint, {
    safety: {
      status: "blocked",
      reason: error.message,
      blockedAt: new Date().toISOString()
    },
    userMessage: "Let's try that scene differently before it becomes permanent."
  });

  const { error: updateError } = await supabase
    .from("generation_jobs")
    .update({
      status: "failed",
      checkpoint,
      error_message: error.message,
      finished_at: new Date().toISOString()
    })
    .eq("id", job.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (job.chapter_id) {
    await supabase
      .from("chapters")
      .update({ status: "failed" })
      .eq("id", job.chapter_id);
  }
}

export async function markJobSucceeded(jobId: string, checkpoint?: JsonValue) {
  const supabase = getSupabaseAdmin();
  const current = checkpoint === undefined ? null : await getJob(jobId);
  const { error } = await supabase
    .from("generation_jobs")
    .update({
      status: "succeeded",
      checkpoint: checkpoint === undefined ? undefined : mergeJsonObjects(current?.checkpoint ?? {}, checkpoint),
      finished_at: new Date().toISOString(),
      error_message: null
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markJobFailed(job: GenerationJobRow, error: unknown) {
  const supabase = getSupabaseAdmin();
  const message = error instanceof Error ? error.message : String(error);
  const isMintPending = error instanceof Error && (error.name === "MintPendingError" || error.message.includes("waiting for Engine confirmation"));

  if (isMintPending) {
    const { error: updateError } = await supabase
      .from("generation_jobs")
      .update({
        status: "retrying",
        run_at: new Date(Date.now() + 5000).toISOString(),
        error_message: message
      })
      .eq("id", job.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
    return;
  }

  const retryCount = job.retry_count + 1;
  const shouldRetry = retryCount <= job.max_retries;
  const retryDelaySeconds = Math.min(60, 2 ** retryCount * 5);

  const { error: updateError } = await supabase
    .from("generation_jobs")
    .update({
      status: shouldRetry ? "retrying" : "dead",
      retry_count: retryCount,
      run_at: shouldRetry ? new Date(Date.now() + retryDelaySeconds * 1000).toISOString() : job.run_at,
      finished_at: shouldRetry ? null : new Date().toISOString(),
      error_message: message
    })
    .eq("id", job.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!shouldRetry && job.chapter_id) {
    await supabase
      .from("chapters")
      .update({ status: "failed" })
      .eq("id", job.chapter_id);
  }
}

function mergeJsonObjects(current: JsonValue, patch: JsonValue): JsonValue {
  if (isJsonObject(current) && isJsonObject(patch)) {
    return { ...current, ...patch };
  }

  return patch;
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
