import "server-only";

import type { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const demoModeRestrictions = [
  { label: "Email sending disabled", enabled: true },
  { label: "SMS sending disabled", enabled: true },
  { label: "WhatsApp sending disabled", enabled: true },
  { label: "Campaign sending disabled", enabled: true },
  { label: "Push notifications disabled", enabled: true },
  { label: "Payment processing disabled", enabled: true },
  { label: "External integrations disabled", enabled: true },
  { label: "Pilot protection banner displayed", enabled: true },
] as const;

export async function isDemoModeEnabled() {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: "demo_mode" },
    select: { value: true },
  });
  const value = setting?.value;
  return Boolean(typeof value === "object" && value && !Array.isArray(value) && "enabled" in value && value.enabled);
}

export async function blockDemoModeExternalAction({
  actorUserId,
  businessId,
  branchId,
  attemptedAction,
  entityType,
  entityId,
  metadata = {},
}: {
  actorUserId?: number | null;
  businessId?: number | null;
  branchId?: number | null;
  attemptedAction: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const enabled = await isDemoModeEnabled();
  if (!enabled) {
    return false;
  }

  await logAuditEvent({
    actorUserId,
    businessId,
    branchId,
    action: "DEMO_MODE_BLOCKED_ACTION",
    entityType,
    entityId,
    metadata: {
      attemptedAction,
      ...(typeof metadata === "object" && metadata && !Array.isArray(metadata) ? metadata : { metadata }),
    },
  });

  return true;
}
