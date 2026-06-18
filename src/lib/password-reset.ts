import "server-only";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { prisma } from "@/lib/prisma";

export const PASSWORD_RESET_EXPIRES_IN_MINUTES = 30;
const PASSWORD_RESET_REQUEST_WINDOW_MINUTES = 15;
const PASSWORD_RESET_REQUEST_LIMIT = 5;

export type PasswordResetMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type PasswordValidationResult = {
  valid: boolean;
  message?: string;
};

export function generatePasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (password.length < 8) return { valid: false, message: "Use at least 8 characters." };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Use at least one lowercase letter." };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Use at least one uppercase letter." };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Use at least one number." };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, message: "Use at least one special character." };
  return { valid: true };
}

export function getAppBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return configured.replace(/\/$/, "");
}

export function buildPasswordResetUrl(token: string) {
  return `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

async function logPasswordResetAudit({
  tx = prisma,
  action,
  user,
  metadata,
}: {
  tx?: Prisma.TransactionClient | typeof prisma;
  action: string;
  user: { id: number; businessId: number | null; branchId: number | null };
  metadata: Prisma.InputJsonValue;
}) {
  await logAuditEvent({
    tx,
    actorUserId: user.id,
    businessId: user.businessId,
    branchId: user.branchId,
    action,
    entityType: "user",
    entityId: user.id,
    metadata,
  });
}

export async function requestPasswordReset(emailInput: string, meta: PasswordResetMeta = {}) {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: true };

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      businessId: true,
      branchId: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return { ok: true };
  }

  const requestWindowStart = new Date(Date.now() - PASSWORD_RESET_REQUEST_WINDOW_MINUTES * 60 * 1000);
  const recentRequests = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: requestWindowStart },
    },
  });

  if (recentRequests >= PASSWORD_RESET_REQUEST_LIMIT) {
    await logPasswordResetAudit({
      action: "PASSWORD_RESET_RATE_LIMITED",
      user,
      metadata: {
        email,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
    return { ok: true };
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000);
  const requestedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: requestedAt },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedIp: meta.ipAddress ?? null,
        requestedUserAgent: meta.userAgent ?? null,
      },
    });

    await logPasswordResetAudit({
      tx,
      action: "PASSWORD_RESET_REQUESTED",
      user,
      metadata: {
        email,
        expiresAt: expiresAt.toISOString(),
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
  });

  await sendPasswordResetEmail({
    to: user.email,
    resetUrl: buildPasswordResetUrl(rawToken),
    expiresInMinutes: PASSWORD_RESET_EXPIRES_IN_MINUTES,
  });

  return { ok: true };
}

export async function resetPasswordWithToken({
  token,
  newPassword,
  confirmPassword,
  meta = {},
}: {
  token: string;
  newPassword: string;
  confirmPassword: string;
  meta?: PasswordResetMeta;
}) {
  if (!token) return { ok: false, error: "Invalid or expired reset link." };
  if (newPassword !== confirmPassword) return { ok: false, error: "Passwords do not match." };

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { ok: false, error: passwordValidation.message ?? "Password does not meet requirements." };
  }

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          status: true,
          businessId: true,
          branchId: true,
        },
      },
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date() || resetToken.user.status !== "ACTIVE") {
    return { ok: false, error: "Invalid or expired reset link." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const changedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        forcePasswordChange: false,
        passwordChangedAt: changedAt,
        sessionVersion: { increment: 1 },
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
      },
      data: { usedAt: changedAt },
    });

    await logPasswordResetAudit({
      tx,
      action: "PASSWORD_RESET_COMPLETED",
      user: resetToken.user,
      metadata: {
        passwordChangedAt: changedAt.toISOString(),
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
  });

  return { ok: true };
}
