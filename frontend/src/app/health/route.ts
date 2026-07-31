import { NextResponse } from "next/server";
import { hasSupabaseAdminConfig } from "@/server/db/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "loreloom-api",
    supabaseConfigured: hasSupabaseAdminConfig()
  });
}
