import "server-only";

import type { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TWO_FACTOR_REQUIREMENT, type TwoFactorRequirement } from "@/lib/two-factor-policy";

export const demoModeRestrictions = [
  { label: "Email sending disabled", enabled: true },
  { label: "SMS sending disabled", enabled: true },
  { label: "WhatsApp sending disabled", enabled: true },
  { label: "Campaign sending disabled", enabled: true },
  { label: "Push notifications disabled", enabled: true },
  { label: "Payment processing disabled", enabled: true },
  { label: "External integrations disabled", enabled: true },
] as const;

export async function isDemoModeEnabled() {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: "demo_mode" },
    select: { value: true },
  });
  const value = setting?.value;
  return Boolean(typeof value === "object" && value && !Array.isArray(value) && "enabled" in value && value.enabled);
}

export const TWO_FACTOR_REQUIREMENT_SETTING_KEY = "two_factor_requirement";

/**
 * Per-role "require 2FA" switches. Both default to false, so an environment
 * that has never touched this setting behaves exactly as before.
 */
export async function getTwoFactorRequirement(): Promise<TwoFactorRequirement> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: TWO_FACTOR_REQUIREMENT_SETTING_KEY },
    select: { value: true },
  });

  const value = setting?.value;
  if (typeof value !== "object" || !value || Array.isArray(value)) {
    return DEFAULT_TWO_FACTOR_REQUIREMENT;
  }

  const record = value as Record<string, unknown>;
  return {
    requireTwoFactorPlatformOwner: record.requireTwoFactorPlatformOwner === true,
    requireTwoFactorBusinessOwner: record.requireTwoFactorBusinessOwner === true,
  };
}

export async function setTwoFactorRequirement(requirement: TwoFactorRequirement) {
  await prisma.platformSetting.upsert({
    where: { key: TWO_FACTOR_REQUIREMENT_SETTING_KEY },
    update: { value: { ...requirement } },
    create: { key: TWO_FACTOR_REQUIREMENT_SETTING_KEY, value: { ...requirement } },
  });
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
