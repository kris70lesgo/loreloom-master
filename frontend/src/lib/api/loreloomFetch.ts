"use client";

import { createClient } from "@/lib/supabase/client";

const GUEST_ID_KEY = "loreloom_guest_user_id";

function getGuestUserId() {
  if (typeof window === "undefined") return null;

  const existing = localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}

export async function getLoreloomOwner() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const {
    data: { session }
  } = typeof supabase.auth.getSession === "function"
    ? await supabase.auth.getSession()
    : { data: { session: null } };

  return {
    ownerId: user?.id ?? getGuestUserId(),
    accessToken: session?.access_token ?? null
  };
}

export async function loreloomFetch(input: string, init: RequestInit = {}) {
  const { ownerId, accessToken } = await getLoreloomOwner();
  const headers = new Headers(init.headers);

  if (ownerId) {
    headers.set("x-loreloom-owner-id", ownerId);
  }
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(input, {
    ...init,
    headers
  });
}
