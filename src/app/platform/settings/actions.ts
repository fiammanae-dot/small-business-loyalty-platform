"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateCsrfForm } from "@/lib/csrf";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function toggleDemoModeAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "platform:settings");
  } catch {
    redirect("/platform/settings?error=Security check failed. Please refresh and try again.");
  }

  const user = await requireRole("PLATFORM_OWNER");
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
  redirect("/platform/settings?success=Safety mode updated.");
}
