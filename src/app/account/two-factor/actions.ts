"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  canUseTwoFactor,
  countUnusedBackupCodes,
  replaceBackupCodes,
  TwoFactorNotConfiguredError,
  verifyAndConsumeTwoFactorChallenge,
  verifyTotpAgainstEncryptedSecret,
} from "@/lib/two-factor";

const CSRF_SCOPE = "account:two-factor";
const INVALID_CODE_MESSAGE = "That code is not valid. Check your authenticator app and try again.";

export type TwoFactorSetupState = {
  error?: string;
  success?: string;
  /** Present only in the render immediately after enabling or regenerating. */
  backupCodes?: string[];
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Enrollment is limited to the two administrative roles. Everyone else (and
 * anyone signed out) is bounced before any 2FA state can be read or written.
 */
async function requireTwoFactorCapableUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canUseTwoFactor(user.role)) redirect("/");
  return user;
}

/** Step 2 of enable: confirm the user's app is generating correct codes, then activate. */
export async function confirmTwoFactorAction(_state: TwoFactorSetupState, formData: FormData): Promise<TwoFactorSetupState> {
  try {
    validateCsrfForm(formData, CSRF_SCOPE);
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const user = await requireTwoFactorCapableUser();
  const encryptedSecret = getString(formData, "encryptedSecret");
  const code = getString(formData, "code");

  if (!encryptedSecret) {
    return { error: "Your setup session expired. Start the setup again." };
  }

  try {
    if (!verifyTotpAgainstEncryptedSecret(encryptedSecret, code)) {
      return { error: INVALID_CODE_MESSAGE };
    }

    const activatedAt = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: true,
        twoFactorActivatedAt: activatedAt,
        lastTotpStep: null,
      },
    });

    const backupCodes = await replaceBackupCodes(user.id);

    await logAuditEvent({
      actorUserId: user.id,
      businessId: user.businessId,
      action: "TWO_FACTOR_ENABLED",
      entityType: "user",
      entityId: user.id,
      metadata: { backupCodesIssued: backupCodes.length },
    });

    return { success: "Two-factor authentication is now active.", backupCodes };
  } catch (error) {
    if (error instanceof TwoFactorNotConfiguredError) return { error: error.message };
    throw error;
  }
}

/** Disable requires proof of possession (a current code) or the account password. */
export async function disableTwoFactorAction(_state: TwoFactorSetupState, formData: FormData): Promise<TwoFactorSetupState> {
  try {
    validateCsrfForm(formData, CSRF_SCOPE);
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const user = await requireTwoFactorCapableUser();
  const code = getString(formData, "code");
  const password = getString(formData, "password");

  if (!user.twoFactorEnabled) {
    return { error: "Two-factor authentication is not enabled on this account." };
  }
  if (!code.trim() && !password) {
    return { error: "Enter a current authentication code or your password to disable two-factor authentication." };
  }

  try {
    let verified = false;

    if (code.trim()) {
      const result = await verifyAndConsumeTwoFactorChallenge(user.id, code);
      verified = result.ok;
    }

    if (!verified && password) {
      const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
      verified = record ? await bcrypt.compare(password, record.passwordHash) : false;
    }

    if (!verified) {
      return { error: INVALID_CODE_MESSAGE };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorActivatedAt: null, lastTotpStep: null },
      });
      await tx.twoFactorBackupCode.deleteMany({ where: { userId: user.id } });
    });

    await logAuditEvent({
      actorUserId: user.id,
      businessId: user.businessId,
      action: "TWO_FACTOR_DISABLED",
      entityType: "user",
      entityId: user.id,
      metadata: {},
    });

    return { success: "Two-factor authentication has been turned off." };
  } catch (error) {
    if (error instanceof TwoFactorNotConfiguredError) return { error: error.message };
    throw error;
  }
}

/** Regenerating invalidates every previous code and shows the new set once. */
export async function regenerateBackupCodesAction(_state: TwoFactorSetupState, formData: FormData): Promise<TwoFactorSetupState> {
  try {
    validateCsrfForm(formData, CSRF_SCOPE);
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const user = await requireTwoFactorCapableUser();
  const code = getString(formData, "code");

  if (!user.twoFactorEnabled) {
    return { error: "Enable two-factor authentication before generating backup codes." };
  }

  try {
    const result = await verifyAndConsumeTwoFactorChallenge(user.id, code);
    if (!result.ok) {
      return { error: INVALID_CODE_MESSAGE };
    }

    const backupCodes = await replaceBackupCodes(user.id);

    await logAuditEvent({
      actorUserId: user.id,
      businessId: user.businessId,
      action: "TWO_FACTOR_BACKUP_CODES_REGENERATED",
      entityType: "user",
      entityId: user.id,
      metadata: { backupCodesIssued: backupCodes.length },
    });

    return { success: "New backup codes generated. Your previous codes no longer work.", backupCodes };
  } catch (error) {
    if (error instanceof TwoFactorNotConfiguredError) return { error: error.message };
    throw error;
  }
}

export async function getRemainingBackupCodeCount(userId: number) {
  return countUnusedBackupCodes(userId);
}
