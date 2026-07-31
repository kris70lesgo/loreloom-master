import { NextResponse } from "next/server";
import { ProviderRequestError, ProviderSetupError } from "@/server/ai/errors";
import { HttpError } from "@/server/http/errors";

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ProviderSetupError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof ProviderRequestError) {
    const status = error.status && error.status >= 400 ? error.status : 502;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}

export function validationError(error: unknown) {
  const details = error instanceof Error ? error.message : "Invalid request.";
  return NextResponse.json({ error: "Invalid request.", details }, { status: 400 });
}
