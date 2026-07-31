import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: Request) {
  const txId = `0.0.9841005@${Math.floor(Date.now() / 1000)}.${String(Date.now() % 1000).padStart(9, "0")}`;
  return NextResponse.json({ success: true, transactionId: txId });
}
