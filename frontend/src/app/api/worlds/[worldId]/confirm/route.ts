import { NextResponse } from "next/server";
import { confirmWorld } from "@/server/services/worlds";
import { errorResponse } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: RouteContext<"/api/worlds/[worldId]/confirm">) {
  const { worldId } = await ctx.params;
  if (!worldId) {
    return NextResponse.json({ error: "worldId is required." }, { status: 400 });
  }

  try {
    const result = await confirmWorld(worldId);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
