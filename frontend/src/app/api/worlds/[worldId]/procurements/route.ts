import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/db/supabase";
import { errorResponse } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/worlds/[worldId]/procurements">) {
  const { worldId } = await ctx.params;
  if (!worldId) {
    return NextResponse.json({ error: "worldId is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: procurements } = await supabase
      .from("procurements")
      .select("id, world_id, chapter_id, provider_id, task_type, status, cost_hbar, payment_receipt, hashscan_url, asset_url, created_at, updated_at, provider_registry(name, category)")
      .eq("world_id", worldId);
    return NextResponse.json({ procurements });
  } catch (error) {
    return errorResponse(error);
  }
}
