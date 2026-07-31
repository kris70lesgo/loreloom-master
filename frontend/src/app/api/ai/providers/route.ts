import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/server/ai/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ providers: getProviderStatuses() });
}
