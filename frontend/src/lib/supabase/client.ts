import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return a no-op stub when Supabase env vars are not configured
  if (!url || !key) {
    const stub = {
      auth: {
        getUser: async () => ({ data: { user: null } }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error("Supabase not configured") }),
        signUpWithPassword: async () => ({ error: new Error("Supabase not configured") }),
        signInWithOAuth: async () => ({ error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
        updateUser: async () => ({ error: new Error("Supabase not configured") }),
      },
    };
    return stub as unknown as SupabaseClient;
  }

  return createBrowserClient(url, key);
}
