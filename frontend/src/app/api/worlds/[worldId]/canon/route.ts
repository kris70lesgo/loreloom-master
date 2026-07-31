import { NextResponse } from "next/server";
import { getCanon } from "@/server/services/worlds";
import { errorResponse } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/worlds/[worldId]/canon">) {
  const { worldId } = await ctx.params;
  if (!worldId) {
    return NextResponse.json({ error: "worldId is required." }, { status: 400 });
  }

  try {
    const result = await getCanon(worldId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
