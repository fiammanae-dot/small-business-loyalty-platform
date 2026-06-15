"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { roleHomePath } from "@/lib/roles";
import { createSession, getCurrentUser } from "@/lib/session";

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters.")
      .regex(/[a-z]/, "Use at least one lowercase letter.")
      .regex(/[A-Z]/, "Use at least one uppercase letter.")
      .regex(/[0-9]/, "Use at least one number.")
      .regex(/[^A-Za-z0-9]/, "Use at least one symbol."),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
    }
  });

export type ChangePasswordState = {
  error?: string;
};

export async function changePasswordAction(_state: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  try {
    validateCsrfForm(formData, "change-password");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = passwordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Password does not meet requirements." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const changedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        forcePasswordChange: false,
        passwordChangedAt: changedAt,
        sessionVersion: { increment: 1 },
      },
    });

    await logAuditEvent({
      tx,
      actorUserId: user.id,
      businessId: user.businessId,
      branchId: user.branchId,
      action: "PASSWORD_CHANGED",
      entityType: "user",
      entityId: user.id,
      metadata: { forced: user.forcePasswordChange },
    });
  });

  await createSession({ id: user.id, role: user.role });
  redirect(roleHomePath[user.role]);
}
