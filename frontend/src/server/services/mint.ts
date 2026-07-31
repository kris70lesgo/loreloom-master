import { createHash } from "node:crypto";
import { AiBlockedError, MintPendingError } from "@/server/ai/errors";
import { config } from "@/server/config";
import { getSupabaseAdmin } from "@/server/db/supabase";
import type { ChapterRow, MintTransactionRow, WorldRow } from "@/server/db/types";
import { getEngineTransaction, submitContractWrite } from "@/server/services/thirdwebEngine";

type MintResult = {
  tokenId: string;
  txHash: string;
  metadataUri: string;
  mint: MintTransactionRow;
};

export async function mintGenesis(world: WorldRow, metadataUri: string): Promise<MintResult> {
  return ensureMintTransaction({
    idempotencyKey: `genesis-${world.id}`,
    txType: "genesis",
    worldId: world.id,
    recipient: await getWorldRecipient(world),
    metadataUri,
    contractAddress: resolveContractAddress(config.mint.genesisContractAddress, "mock-genesis-contract", "GENESIS_CONTRACT_ADDRESS")
  });
}

export async function mintChapter(world: WorldRow, chapter: ChapterRow, metadataUri: string): Promise<MintResult> {
  if (!world.genesis_token_id) {
    throw new Error("Cannot mint a chapter before its Genesis token is confirmed.");
  }
  return ensureMintTransaction({
    idempotencyKey: `chapter-${world.id}-${chapter.chapter_index}`,
    txType: "chapter",
    worldId: world.id,
    chapterId: chapter.id,
    recipient: await getWorldRecipient(world),
    genesisTokenId: world.genesis_token_id,
    metadataUri,
    contractAddress: resolveContractAddress(config.mint.chapterContractAddress, "mock-chapter-contract", "CHAPTER_CONTRACT_ADDRESS")
  });
}

async function ensureMintTransaction(input: {
  idempotencyKey: string;
  txType: "genesis" | "chapter";
  worldId: string;
  chapterId?: string;
  recipient: string;
  genesisTokenId?: string;
  metadataUri: string;
  contractAddress: string;
}): Promise<MintResult> {
  const supabase = getSupabaseAdmin();
  const existing = await findMint(input.idempotencyKey);

  if (existing?.status === "confirmed" && existing.token_id && existing.tx_hash) {
    return { tokenId: existing.token_id, txHash: existing.tx_hash, metadataUri: input.metadataUri, mint: existing };
  }

  if (config.mint.mode === "mock") {
    return recordMockMint(input);
  }
  if (config.mint.mode !== "thirdweb-engine" && config.mint.mode !== "thirdweb-transactions") {
    throw new Error(`Unsupported MINT_MODE=${config.mint.mode}. Use mock, thirdweb-engine, or thirdweb-transactions.`);
  }

  const existingQueueId = existing?.tx_hash?.startsWith("engine:") ? existing.tx_hash.slice("engine:".length) : undefined;
  const queueId = existingQueueId ?? (await submitContractWrite({
    contractAddress: input.contractAddress,
    functionName: input.txType === "genesis" ? "mint" : "mintChapter",
    args: input.txType === "genesis"
      ? [input.recipient, input.metadataUri]
      : [input.recipient, input.genesisTokenId!, input.metadataUri],
    idempotencyKey: input.idempotencyKey
  })).queueId;

  await upsertMint({
    input,
    txHash: `engine:${queueId}`,
    tokenId: null,
    status: "submitted",
    errorMessage: null
  });
  const transaction = await getEngineTransaction(queueId);
  if (transaction.status === "errored" || transaction.status === "cancelled") {
    await upsertMint({
      input,
      txHash: transaction.transactionHash ?? `engine:${queueId}`,
      tokenId: null,
      status: "failed",
      errorMessage: transaction.errorMessage ?? `Engine transaction ${transaction.status}.`
    });
    throw new Error(transaction.errorMessage ?? `thirdweb Engine transaction ${transaction.status}.`);
  }
  if (transaction.status !== "mined" || !transaction.transactionHash) {
    throw new MintPendingError(`Mint transaction is ${transaction.status}; waiting for Engine confirmation.`);
  }

  const confirmed = await upsertMint({
    input,
    txHash: transaction.transactionHash,
    tokenId: await nextTokenId(input.contractAddress),
    status: "confirmed",
    errorMessage: null
  });
  return { tokenId: confirmed.token_id!, txHash: confirmed.tx_hash!, metadataUri: input.metadataUri, mint: confirmed };
}

async function getWorldRecipient(world: WorldRow) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("wallet_address").eq("id", world.creator_id).single();
  if (error || !data?.wallet_address) throw new Error(error?.message ?? "World creator wallet is missing.");
  return data.wallet_address;
}

async function findMint(idempotencyKey: string): Promise<MintTransactionRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("mint_transactions").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MintTransactionRow | null) ?? null;
}

async function upsertMint({ input, txHash, tokenId, status, errorMessage }: {
  input: Parameters<typeof ensureMintTransaction>[0]; txHash: string | null; tokenId: string | null;
  status: "submitted" | "confirmed" | "failed"; errorMessage: string | null;
}): Promise<MintTransactionRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("mint_transactions").upsert({
    idempotency_key: input.idempotencyKey, tx_hash: txHash, token_id: tokenId,
    contract_address: input.contractAddress, tx_type: input.txType, world_id: input.worldId,
    chapter_id: input.chapterId, status, error_message: errorMessage
  }, { onConflict: "idempotency_key" }).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Could not record mint transaction.");
  return data as MintTransactionRow;
}

async function recordMockMint(input: Parameters<typeof ensureMintTransaction>[0]): Promise<MintResult> {
  const tokenId = stableTokenId(input.idempotencyKey);
  const txHash = `0x${createHash("sha256").update(`tx:${input.idempotencyKey}`).digest("hex")}`;
  const mint = await upsertMint({ input, txHash, tokenId, status: "confirmed", errorMessage: null });
  return { tokenId, txHash, metadataUri: input.metadataUri, mint };
}

async function nextTokenId(contractAddress: string) {
  // Token IDs are sequential and start at one in both Loreloom contracts.
  // The database stores only confirmed mints, so count gives the just-confirmed token ID.
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase.from("mint_transactions").select("id", { count: "exact", head: true })
    .eq("contract_address", contractAddress).eq("status", "confirmed");
  if (error) throw new Error(error.message);
  return String((count ?? 0) + 1);
}

function resolveContractAddress(address: string | undefined, mockAddress: string, envName: string) {
  if (address) return address;
  if (config.mint.mode === "mock") return mockAddress;
  throw new Error(`${envName} is required when minting on-chain.`);
}

function stableTokenId(value: string) {
  return BigInt(`0x${createHash("sha256").update(value).digest("hex").slice(0, 12)}`).toString(10);
}
