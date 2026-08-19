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

export function loreloomApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!configuredBase || isUnsafeBrowserApiBase(configuredBase)) {
    return normalizedPath;
  }

  return `${configuredBase}${normalizedPath}`;
}

function isUnsafeBrowserApiBase(baseUrl: string) {
  if (typeof window === "undefined") return false;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return false;

  try {
    const url = new URL(baseUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
