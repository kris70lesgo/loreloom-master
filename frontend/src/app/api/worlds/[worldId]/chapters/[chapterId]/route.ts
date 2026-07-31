import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteChapter, updateChapterContent } from "@/server/services/worlds";
import { errorResponse, validationError } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

const updateChapterSchema = z.object({
  content: z.string(),
  sceneDescription: z.string().optional()
});

export async function DELETE(_request: Request, ctx: RouteContext<"/api/worlds/[worldId]/chapters/[chapterId]">) {
  const { worldId, chapterId } = await ctx.params;
  if (!worldId || !chapterId) {
    return NextResponse.json({ error: "worldId and chapterId are required." }, { status: 400 });
  }

  try {
    const result = await deleteChapter(worldId, chapterId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/worlds/[worldId]/chapters/[chapterId]">) {
  const { worldId, chapterId } = await ctx.params;
  if (!worldId || !chapterId) {
    return NextResponse.json({ error: "worldId and chapterId are required." }, { status: 400 });
  }

  const parsed = updateChapterSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const result = await updateChapterContent(
      worldId,
      chapterId,
      parsed.data.content,
      parsed.data.sceneDescription
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
