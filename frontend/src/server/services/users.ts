import { z } from "zod";
import { getSupabaseAdmin } from "@/server/db/supabase";
import type { UserRow } from "@/server/db/types";
import { HttpError } from "@/server/http/errors";

const walletSchema = z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "Wallet address must be an EVM address.");
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeWalletAddress(walletAddress: string) {
  const trimmed = walletAddress.trim();
  if (uuidRegex.test(trimmed)) {
    return trimmed;
  }
  return walletSchema.parse(trimmed).toLowerCase();
}

export async function getOrCreateUser(identifier: string): Promise<UserRow> {
  const supabase = getSupabaseAdmin();
  const trimmed = identifier.trim();

  // 1. If identifier is a Supabase Auth UUID
  if (uuidRegex.test(trimmed)) {
    const { data: existing } = await supabase.from("users").select("*").eq("id", trimmed).maybeSingle();
    if (existing) {
      return existing as UserRow;
    }

    const { data, error } = await supabase
      .from("users")
      .upsert({ id: trimmed, wallet_address: trimmed }, { onConflict: "id" })
      .select("*")
      .single();

    if (!error && data) {
      return data as UserRow;
    }
  }

  // 2. Default EVM wallet address or fallback identifier
  const normalized = walletSchema.safeParse(trimmed).success ? trimmed.toLowerCase() : trimmed;
  const { data, error } = await supabase
    .from("users")
    .upsert({ wallet_address: normalized }, { onConflict: "wallet_address" })
    .select("*")
    .single();

  if (error || !data) {
    throw new HttpError(500, error?.message ?? "Could not create user.");
  }

  return data as UserRow;
}
