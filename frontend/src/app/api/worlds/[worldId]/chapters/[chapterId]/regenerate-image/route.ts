import { NextResponse } from "next/server";
import { z } from "zod";
import { regenerateChapterImage } from "@/server/services/worlds";
import { errorResponse, validationError } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

const regenerateImageSchema = z.object({
  narrativeContext: z.string().optional(),
  styleLock: z.string().optional(),
  aspectRatio: z.enum(["16:9", "1:1", "9:16"]).optional()
});

export async function POST(request: Request, ctx: RouteContext<"/api/worlds/[worldId]/chapters/[chapterId]/regenerate-image">) {
  const { worldId, chapterId } = await ctx.params;
  if (!worldId || !chapterId) {
    return NextResponse.json({ error: "worldId and chapterId are required." }, { status: 400 });
  }

  const parsed = regenerateImageSchema.safeParse(await request.json().catch(() => ({})));
  const options = parsed.success ? parsed.data : {};

  try {
    const result = await regenerateChapterImage(worldId, chapterId, options);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
