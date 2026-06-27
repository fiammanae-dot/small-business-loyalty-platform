import { NextResponse } from "next/server";
import { classifySupportPath, recordSupportActivity } from "@/lib/support-activity";
import { getActiveSupportSessionForCurrentAdmin } from "@/lib/support-sessions";

export async function POST(request: Request) {
  const supportContext = await getActiveSupportSessionForCurrentAdmin();
  if (!supportContext) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let payload: { path?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = typeof payload.path === "string" ? payload.path.slice(0, 512) : "";
  if (!path.startsWith("/dashboard")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const classified = classifySupportPath(path);
  await recordSupportActivity({
    supportSessionId: supportContext.supportSession.id,
    adminUserId: supportContext.supportSession.adminUserId,
    businessId: supportContext.supportSession.businessId,
    activityType: classified.activityType,
    path,
    entityType: classified.entityType,
    entityId: classified.entityId,
    description: classified.description,
    throttleMinutes: 5,
  });

  return NextResponse.json({ ok: true });
}
