import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Diagnostic endpoint: verifies that Sentry captures server-side errors in
// production. It only throws when called with the correct key, so it cannot be
// triggered accidentally. Safe to remove once monitoring is verified.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== "verify-sentry-2026") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  throw new Error(
    "SENTRY_VERIFY_TEST: intentional test error to confirm production error monitoring is active. Safe to resolve.",
  );
}
