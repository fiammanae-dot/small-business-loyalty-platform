import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Diagnostic endpoint: verifies that Sentry captures server-side errors in
// production. Key-gated so it cannot be triggered accidentally. It explicitly
// captures a test event and flushes it to Sentry before responding, and reports
// whether the Sentry client initialised at runtime. Safe to remove once
// monitoring is verified.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== "verify-sentry-2026") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const dsnPresent = Boolean(process.env.SENTRY_DSN);
  const clientActive = Boolean(Sentry.getClient());

  const eventId = Sentry.captureException(
    new Error(
      "SENTRY_VERIFY_TEST v2: intentional test error to confirm production error monitoring is active. Safe to resolve.",
    ),
  );

  const flushed = await Sentry.flush(3000);

  return NextResponse.json({
    ok: true,
    dsnPresent,
    clientActive,
    eventId: eventId ?? null,
    flushed,
  });
}
