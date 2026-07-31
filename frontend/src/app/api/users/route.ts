import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/server/services/users";
import { errorResponse, validationError } from "@/server/http/nextError";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  walletAddress: z.string()
});

export async function POST(request: Request) {
  const parsed = createUserSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const user = await getOrCreateUser(parsed.data.walletAddress);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
