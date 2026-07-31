import { NextResponse } from "next/server";
import { retryChapterGeneration } from "@/server/services/worlds";
import { errorResponse } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: RouteContext<"/api/worlds/[worldId]/chapters/[chapterId]/retry">) {
  const { worldId, chapterId } = await ctx.params;
  if (!worldId || !chapterId) {
    return NextResponse.json({ error: "worldId and chapterId are required." }, { status: 400 });
  }

  try {
    const result = await retryChapterGeneration(worldId, chapterId);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
