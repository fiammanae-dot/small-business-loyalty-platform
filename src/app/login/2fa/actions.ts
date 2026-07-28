"use server";

import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { isLoginTemporarilyLocked, LOGIN_LOCKOUT_MESSAGE, recordFailedLogin } from "@/lib/login-protection";
import { prisma } from "@/lib/prisma";
import { roleHomePath } from "@/lib/roles";
import { createSession, INACTIVE_BUSINESS_ACCESS_MESSAGE, isBusinessScopedRole } from "@/lib/session";
import {
  clearTwoFactorPendingCookie,
  getTwoFactorPendingUserId,
  TwoFactorNotConfiguredError,
  verifyAndConsumeTwoFactorChallenge,
} from "@/lib/two-factor";

const INVALID_CODE_MESSAGE = "That code is not valid. Try again or use a backup code.";
const EXPIRED_MESSAGE = "Your sign-in request expired. Please sign in again.";

export type TwoFactorChallengeState = {
  error?: string;
};

export async function verifyTwoFactorLoginAction(
  _state: TwoFactorChallengeState,
  formData: FormData,
): Promise<TwoFactorChallengeState> {
  try {
    validateCsrfForm(formData, "login:2fa");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const pendingUserId = await getTwoFactorPendingUserId();
  if (!pendingUserId) {
    redirect("/login?error=" + encodeURIComponent(EXPIRED_MESSAGE));
  }

  const user = await prisma.user.findUnique({
    where: { id: pendingUserId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      forcePasswordChange: true,
      businessId: true,
      business: { select: { status: true } },
    },
  });

  if (!user || user.status !== "ACTIVE") {
    await clearTwoFactorPendingCookie();
    redirect("/login?error=" + encodeURIComponent(EXPIRED_MESSAGE));
  }

  // Second-factor attempts reuse the same lockout ledger as password attempts,
  // so an attacker who already has the password cannot brute-force the code.
  if (await isLoginTemporarilyLocked(user.email)) {
    await recordFailedLogin(user.email, "LOCKED");
    return { error: LOGIN_LOCKOUT_MESSAGE };
  }

  const submitted = typeof formData.get("code") === "string" ? (formData.get("code") as string) : "";
  if (!submitted.trim()) {
    return { error: INVALID_CODE_MESSAGE };
  }

  let result: Awaited<ReturnType<typeof verifyAndConsumeTwoFactorChallenge>>;
  try {
    result = await verifyAndConsumeTwoFactorChallenge(user.id, submitted);
  } catch (error) {
    if (error instanceof TwoFactorNotConfiguredError) {
      return { error: error.message };
    }
    throw error;
  }

  if (!result.ok) {
    await recordFailedLogin(user.email, "FAILED");
    await logAuditEvent({
      actorUserId: user.id,
      businessId: user.businessId,
      action: "TWO_FACTOR_CHALLENGE_FAILED",
      entityType: "user",
      entityId: user.id,
      metadata: { reason: result.reason },
    });
    return { error: INVALID_CODE_MESSAGE };
  }

  if (isBusinessScopedRole(user.role) && (!user.businessId || user.business?.status !== "ACTIVE")) {
    await clearTwoFactorPendingCookie();
    return { error: INACTIVE_BUSINESS_ACCESS_MESSAGE };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "TWO_FACTOR_CHALLENGE_PASSED",
    entityType: "user",
    entityId: user.id,
    metadata: { method: result.method },
  });

  await clearTwoFactorPendingCookie();
  await createSession({ id: user.id, role: user.role });
  redirect(user.forcePasswordChange ? "/change-password" : roleHomePath[user.role]);
}
