import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import { config } from "../config.js";
import { MintPendingError } from "../ai/errors.js";
import { getSupabaseAdmin } from "../db/supabase.js";
import type { ChapterRow, MintTransactionRow, WorldRow } from "../db/types.js";

// Minimal ABIs — only the functions we call.
const GENESIS_ABI = [
  "function mint(address recipient, string tokenUri) external returns (uint256)",
];
const CHAPTER_ABI = [
  "function mintChapter(address recipient, uint256 genesisTokenId, string tokenUri) external returns (uint256)",
];

type MintResult = {
  tokenId: string;
  txHash: string;
  metadataUri: string;
  mint: MintTransactionRow;
};

function getSigner(): { signer: Wallet; provider: JsonRpcProvider } {
  const privateKey = config.mint.mintDeployerPrivateKey;
  const rpcUrl = config.mint.rpcUrl;
  if (!privateKey) {
    throw new Error(
      "Direct minting is not configured. Set MINT_DEPLOYER_PRIVATE_KEY in .env with the deployer wallet's private key."
    );
  }
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  return { signer, provider };
}

export async function directMintGenesis(world: WorldRow, metadataUri: string): Promise<MintResult> {
  if (!config.mint.genesisContractAddress) {
    throw new Error("GENESIS_CONTRACT_ADDRESS is required for on-chain minting.");
  }
  const recipient = await getWorldRecipient(world);
  return ensureMintTransaction({
    idempotencyKey: `genesis-${world.id}`,
    txType: "genesis",
    worldId: world.id,
    recipient,
    metadataUri,
    contractAddress: config.mint.genesisContractAddress,
  });
}

export async function directMintChapter(
  world: WorldRow,
  chapter: ChapterRow,
  metadataUri: string
): Promise<MintResult> {
  if (!world.genesis_token_id) {
    throw new Error("Cannot mint a chapter before its Genesis token is confirmed.");
  }
  if (!config.mint.chapterContractAddress) {
    throw new Error("CHAPTER_CONTRACT_ADDRESS is required for on-chain minting.");
  }
  const recipient = await getWorldRecipient(world);
  return ensureMintTransaction({
    idempotencyKey: `chapter-${world.id}-${chapter.chapter_index}`,
    txType: "chapter",
    worldId: world.id,
    chapterId: chapter.id,
    recipient,
    genesisTokenId: world.genesis_token_id,
    metadataUri,
    contractAddress: config.mint.chapterContractAddress,
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
  const existing = await findMint(input.idempotencyKey);

  // Already confirmed — return cached result.
  if (existing?.status === "confirmed" && existing.token_id && existing.tx_hash) {
    return {
      tokenId: existing.token_id,
      txHash: existing.tx_hash,
      metadataUri: input.metadataUri,
      mint: existing,
    };
  }

  // Already submitted but not yet confirmed — check the transaction.
  if (existing?.status === "submitted" && existing.tx_hash && !existing.tx_hash.startsWith("engine:")) {
    const receipt = await waitForReceipt(existing.tx_hash, input.contractAddress);
    if (receipt.confirmed) {
      const confirmed = await upsertMint({
        input,
        txHash: receipt.txHash,
        tokenId: receipt.tokenId,
        status: "confirmed",
        errorMessage: null,
      });
      return {
        tokenId: confirmed.token_id!,
        txHash: confirmed.tx_hash!,
        metadataUri: input.metadataUri,
        mint: confirmed,
      };
    }
    if (receipt.failed) {
      await upsertMint({
        input,
        txHash: existing.tx_hash,
        tokenId: null,
        status: "failed",
        errorMessage: receipt.errorMessage ?? "Transaction reverted.",
      });
      throw new Error(receipt.errorMessage ?? "Mint transaction reverted on-chain.");
    }
    // Still pending
    throw new MintPendingError("Mint transaction is still pending on-chain.");
  }

  // Submit a new transaction.
  const { signer, provider } = getSigner();
  const contract = new Contract(
    input.contractAddress,
    input.txType === "genesis" ? GENESIS_ABI : CHAPTER_ABI,
    signer
  );

  let txHash: string;
  let tokenId: string | null = null;

  if (input.txType === "genesis") {
    const tx = await contract.mint(input.recipient, input.metadataUri);
    txHash = tx.hash;
    await upsertMint({ input, txHash, tokenId: null, status: "submitted", errorMessage: null });

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      await upsertMint({ input, txHash, tokenId: null, status: "failed", errorMessage: "Transaction reverted." });
      throw new Error("Genesis mint transaction reverted on-chain.");
    }
    tokenId = parseTokenIdFromReceipt(receipt);
  } else {
    const tx = await contract.mintChapter(
      input.recipient,
      BigInt(input.genesisTokenId!),
      input.metadataUri
    );
    txHash = tx.hash;
    await upsertMint({ input, txHash, tokenId: null, status: "submitted", errorMessage: null });

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      await upsertMint({ input, txHash, tokenId: null, status: "failed", errorMessage: "Transaction reverted." });
      throw new Error("Chapter mint transaction reverted on-chain.");
    }
    tokenId = parseTokenIdFromReceipt(receipt);
  }

  const confirmed = await upsertMint({
    input,
    txHash,
    tokenId,
    status: "confirmed",
    errorMessage: null,
  });
  return {
    tokenId: confirmed.token_id!,
    txHash: confirmed.tx_hash!,
    metadataUri: input.metadataUri,
    mint: confirmed,
  };
}

function parseTokenIdFromReceipt(receipt: ethers.TransactionReceipt): string {
  // Try to parse the token ID from the GenesisMinted/ChapterMinted event.
  // Both events emit the tokenId as the first indexed parameter.
  for (const log of receipt.logs) {
    // The mint event's first topic contains the indexed tokenId.
    // Non-anonymous events have the event signature as topic 0.
    // tokenId is topic 1 (first indexed param).
    if (log.topics.length >= 2 && log.topics[1]) {
      try {
        return BigInt(log.topics[1]).toString();
      } catch {
        // Not a valid bigint, skip
      }
    }
  }
  // Fallback: use the transaction-level count from the DB
  return "";
}

async function waitForReceipt(
  txHash: string,
  contractAddress: string
): Promise<{ confirmed: boolean; failed: boolean; tokenId: string; txHash: string; errorMessage?: string }> {
  const { provider } = getSigner();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    return { confirmed: false, failed: false, tokenId: "", txHash };
  }
  if (receipt.status === 1) {
    return {
      confirmed: true,
      failed: false,
      tokenId: parseTokenIdFromReceipt(receipt),
      txHash: receipt.hash,
    };
  }
  return {
    confirmed: false,
    failed: true,
    tokenId: "",
    txHash: receipt.hash,
    errorMessage: "Transaction reverted on-chain.",
  };
}

async function getWorldRecipient(world: WorldRow): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", world.creator_id)
    .single();
  if (error || !data?.wallet_address) {
    throw new Error(error?.message ?? "World creator wallet is missing.");
  }
  return data.wallet_address;
}

async function findMint(idempotencyKey: string): Promise<MintTransactionRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("mint_transactions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MintTransactionRow | null) ?? null;
}

async function upsertMint({
  input,
  txHash,
  tokenId,
  status,
  errorMessage,
}: {
  input: Parameters<typeof ensureMintTransaction>[0];
  txHash: string | null;
  tokenId: string | null;
  status: "submitted" | "confirmed" | "failed";
  errorMessage: string | null;
}): Promise<MintTransactionRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("mint_transactions")
    .upsert(
      {
        idempotency_key: input.idempotencyKey,
        tx_hash: txHash,
        token_id: tokenId,
        contract_address: input.contractAddress,
        tx_type: input.txType,
        world_id: input.worldId,
        chapter_id: input.chapterId,
        status,
        error_message: errorMessage,
      },
      { onConflict: "idempotency_key" }
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not record mint transaction.");
  return data as MintTransactionRow;
}
