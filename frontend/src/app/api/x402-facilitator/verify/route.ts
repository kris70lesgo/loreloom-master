import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { paymentPayload, paymentRequirements } = await request.json().catch(() => ({}));
  if (!paymentPayload || !paymentRequirements) {
    return NextResponse.json(
      { success: false, error: "Missing paymentPayload or paymentRequirements" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
