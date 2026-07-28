export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JobType =
  | "genesis.generate"
  | "portrait.generate"
  | "genesis.mint"
  | "chapter.generate"
  | "chapter.image"
  | "chapter.mint";

export type JobStatus = "queued" | "processing" | "succeeded" | "failed" | "retrying" | "dead";

export type WorldStatus = "draft" | "portrait_ready" | "locked" | "minting" | "active" | "failed";

export type ChapterStatus = "draft" | "text_ready" | "image_ready" | "minting" | "minted" | "failed";

export type MintStatus = "pending" | "submitted" | "confirmed" | "failed";

export type UserRow = {
  id: string;
  wallet_address: string;
  created_at: string;
};

export type WorldRow = {
  id: string;
  creator_id: string;
  title: string | null;
  intake: JsonValue;
  character_sheet: JsonValue;
  world_facts: JsonValue;
  open_threads: JsonValue;
  reference_image_url: string | null;
  style_lock: string | null;
  genesis_token_id: string | null;
  status: WorldStatus;
  created_at: string;
  updated_at: string;
};

export type ChapterRow = {
  id: string;
  world_id: string;
  chapter_index: number;
  content: string | null;
  image_url: string | null;
  scene_description: string | null;
  chapter_token_id: string | null;
  status: ChapterStatus;
  created_at: string;
  updated_at: string;
};

export type GenerationJobRow = {
  id: string;
  world_id: string | null;
  chapter_id: string | null;
  job_type: JobType;
  status: JobStatus;
  payload: JsonValue;
  checkpoint: JsonValue;
  retry_count: number;
  max_retries: number;
  run_at: string;
  worker_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type MintTransactionRow = {
  id: string;
  idempotency_key: string;
  tx_hash: string | null;
  token_id: string | null;
  contract_address: string | null;
  tx_type: "genesis" | "chapter";
  world_id: string | null;
  chapter_id: string | null;
  status: MintStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
