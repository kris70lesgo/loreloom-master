import { NextResponse } from "next/server";
import { getJob } from "@/server/services/jobs";
import { HttpError } from "@/server/http/errors";
import { errorResponse } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/jobs/[jobId]">) {
  const { jobId } = await ctx.params;
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  try {
    const job = await getJob(jobId);
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return errorResponse(error);
  }
}
