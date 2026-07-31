import { NextResponse } from "next/server";
import { z } from "zod";
import { generateProductionPlans } from "@/server/services/director";
import { getSupabaseAdmin } from "@/server/db/supabase";
import { errorResponse, validationError } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

const generatePlansSchema = z.object({
  budgetHbar: z.number().min(1)
});

const planColumns = "id, world_id, plan_type, estimated_cost_hbar, estimated_duration_ms, estimated_quality_score, provider_allocations, created_at";

export async function GET(_request: Request, ctx: RouteContext<"/api/worlds/[worldId]/plans">) {
  const { worldId } = await ctx.params;
  if (!worldId) {
    return NextResponse.json({ error: "worldId is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: plans } = await supabase
      .from("production_plans")
      .select(planColumns)
      .eq("world_id", worldId);
    return NextResponse.json({ plans });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/worlds/[worldId]/plans">) {
  const { worldId } = await ctx.params;
  if (!worldId) {
    return NextResponse.json({ error: "worldId is required." }, { status: 400 });
  }

  const parsed = generatePlansSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await generateProductionPlans(worldId, parsed.data.budgetHbar);

    const supabase = getSupabaseAdmin();
    const { data: plans } = await supabase
      .from("production_plans")
      .select(planColumns)
      .eq("world_id", worldId);
    return NextResponse.json({ plans });
  } catch (error) {
    return errorResponse(error);
  }
}
