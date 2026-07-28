import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

export function hasSupabaseAdminConfig() {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

export function hasSupabaseAnonConfig() {
  return Boolean(config.supabase.url && config.supabase.anonKey);
}

export function getSupabaseAdmin() {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error("Supabase admin client is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  adminClient ??= createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return adminClient;
}

export function getSupabaseAnon() {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error("Supabase anon client is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  anonClient ??= createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return anonClient;
}
