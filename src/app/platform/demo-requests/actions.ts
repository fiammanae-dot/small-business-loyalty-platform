"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const PATH = "/platform/demo-requests";
const schema = z.object({
  uuid: z.string().uuid(),
  status: z.enum(["NEW", "CONTACTED", "WON", "LOST"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

function fail(message: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(message)}`);
}

/** The System Administrator marks a request contacted, won or lost, with an optional note. */
export async function updateDemoRequestAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "platform:demo-requests");
  } catch {
    fail("Security check failed. Please refresh and try again.");
  }
  const admin = await requireRole("PLATFORM_OWNER");
  const parsed = schema.safeParse({
    uuid: formData.get("uuid"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) fail("Choose a status.");

  const request = await prisma.demoRequest.findUnique({ where: { uuid: parsed.data.uuid }, select: { id: true, status: true, businessName: true } });
  if (!request) fail("Request not found.");

  await prisma.demoRequest.update({
    where: { id: request.id },
    data: { status: parsed.data.status, note: parsed.data.note?.trim() || null },
  });
  await logAuditEvent({
    actorUserId: admin.id,
    action: "DEMO_REQUEST_UPDATED",
    entityType: "demo_request",
    entityId: request.id,
    metadata: { businessName: request.businessName, previousStatus: request.status, nextStatus: parsed.data.status },
  });
  revalidatePath(PATH);
  redirect(`${PATH}?success=${encodeURIComponent(`${request.businessName} marked ${parsed.data.status.toLowerCase()}.`)}`);
}
