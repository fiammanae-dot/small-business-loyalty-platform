"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/authz";
import { validateCsrfForm } from "@/lib/csrf";
import { logAuditEvent } from "@/lib/audit";
import { getTwoFactorRequirement, setTwoFactorRequirement } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

export async function toggleDemoModeAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "platform:settings");
  } catch {
    redirect("/platform/settings?error=Security check failed. Please refresh and try again.");
  }

  const user = await requirePlatformAdmin();
  const enabled = formData.get("enabled") === "true";

  const existing = await prisma.platformSetting.findUnique({
    where: { key: "demo_mode" },
    select: { value: true },
  });
  const previousEnabled = Boolean(
    typeof existing?.value === "object" &&
      existing.value &&
      !Array.isArray(existing.value) &&
      "enabled" in existing.value &&
      existing.value.enabled,
  );

  await prisma.$transaction(async (tx) => {
    await tx.platformSetting.upsert({
      where: { key: "demo_mode" },
      update: { value: { enabled } },
      create: { key: "demo_mode", value: { enabled } },
    });

    if (previousEnabled !== enabled) {
      await logAuditEvent({
        tx,
        actorUserId: user.id,
        businessId: null,
        branchId: null,
        action: enabled ? "DEMO_MODE_ENABLED" : "DEMO_MODE_DISABLED",
        entityType: "platform_setting",
        entityId: "demo_mode",
        metadata: {
          previousEnabled,
          enabled,
        },
      });
    }
  });

  revalidatePath("/platform/settings");
  revalidatePath("/platform");
  revalidatePath("/dashboard");
  revalidatePath("/branch");
  revalidatePath("/staff");
  redirect("/platform/settings?success=Action restrictions updated.");
}

/**
 * Flips the per-role "require two-factor authentication" switch. Turning a
 * switch on makes users of that role complete enrollment before the rest of
 * the app becomes reachable; it never signs anyone out.
 */
export async function setTwoFactorRequirementAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "platform:settings");
  } catch {
    redirect("/platform/settings?tab=security&error=Security check failed. Please refresh and try again.");
  }

  const user = await requirePlatformAdmin();
  const role = formData.get("role");
  const enabled = formData.get("enabled") === "true";

  if (role !== "PLATFORM_OWNER" && role !== "BUSINESS_OWNER") {
    redirect("/platform/settings?tab=security&error=Unknown role for the two-factor requirement.");
  }

  const current = await getTwoFactorRequirement();
  const next =
    role === "PLATFORM_OWNER"
      ? { ...current, requireTwoFactorPlatformOwner: enabled }
      : { ...current, requireTwoFactorBusinessOwner: enabled };

  await setTwoFactorRequirement(next);
  await logAuditEvent({
    actorUserId: user.id,
    businessId: null,
    branchId: null,
    action: enabled ? "TWO_FACTOR_REQUIREMENT_ENABLED" : "TWO_FACTOR_REQUIREMENT_DISABLED",
    entityType: "platform_setting",
    entityId: "two_factor_requirement",
    metadata: { role, enabled },
  });

  revalidatePath("/platform/settings");
  redirect("/platform/settings?tab=security&success=Two-factor requirement updated.");
}
