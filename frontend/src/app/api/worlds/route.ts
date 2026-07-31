import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createWorld, intakeSchema, listUserWorlds } from "@/server/services/worlds";
import { errorResponse, validationError } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

const createWorldSchema = z.object({
  walletAddress: z.string().optional(),
  creatorId: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().trim().min(1).optional(),
  intake: intakeSchema.optional(),
  styleLock: z.string().trim().min(1).optional(),
  aiProvider: z.enum(["openrouter", "nvidia"]).optional()
});

export async function GET(request: NextRequest) {
  const creatorId = request.nextUrl.searchParams.get("creatorId") ||
    request.nextUrl.searchParams.get("walletAddress") ||
    request.nextUrl.searchParams.get("userId");

  if (!creatorId) {
    return NextResponse.json({ worlds: [] });
  }

  try {
    const result = await listUserWorlds(creatorId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const parsed = createWorldSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const userIdentifier = parsed.data.creatorId || parsed.data.userId || parsed.data.walletAddress;
  if (!userIdentifier) {
    return NextResponse.json({ error: "creatorId or walletAddress is required." }, { status: 400 });
  }

  try {
    const result = await createWorld({ ...parsed.data, walletAddress: userIdentifier });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
