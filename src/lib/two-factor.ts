import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSessionSecret } from "@/lib/secrets";
import {
  BACKUP_CODE_COUNT,
  buildOtpAuthUrl,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  formatSecretForManualEntry,
  generateBackupCodes,
  getTotpStep,
  hashBackupCode,
  isReplayedTotpStep,
  parseTwoFactorEncryptionKey,
  TOTP_DIGITS,
  TOTP_PERIOD_SECONDS,
  TOTP_WINDOW_STEPS,
  TWO_FACTOR_KEY_MISSING_MESSAGE,
} from "@/lib/two-factor-policy";

export { TWO_FACTOR_KEY_MISSING_MESSAGE, canUseTwoFactor } from "@/lib/two-factor-policy";

const TWO_FACTOR_PENDING_COOKIE = "loyalty_2fa_pending";
const PENDING_TTL_SECONDS = 5 * 60;
const ISSUER = "Loyalty Card UAE";

authenticator.options = {
  digits: TOTP_DIGITS,
  step: TOTP_PERIOD_SECONDS,
  window: TOTP_WINDOW_STEPS,
};

export class TwoFactorNotConfiguredError extends Error {
  constructor() {
    super(TWO_FACTOR_KEY_MISSING_MESSAGE);
    this.name = "TwoFactorNotConfiguredError";
  }
}

/**
 * Fails closed: without a valid 32-byte TWO_FACTOR_ENCRYPTION_KEY every 2FA
 * endpoint refuses to run rather than storing or reading a plaintext secret.
 */
function requireEncryptionKey(): Buffer {
  const key = parseTwoFactorEncryptionKey(process.env.TWO_FACTOR_ENCRYPTION_KEY);
  if (!key) throw new TwoFactorNotConfiguredError();
  return key;
}

export function isTwoFactorConfigured(): boolean {
  return parseTwoFactorEncryptionKey(process.env.TWO_FACTOR_ENCRYPTION_KEY) !== null;
}

// --- Enrollment ----------------------------------------------------------

export type TwoFactorEnrollmentOffer = {
  encryptedSecret: string;
  manualEntryKey: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
};

/**
 * Generates a fresh secret and everything the UI needs to display it. The
 * secret is returned already encrypted so it can be round-tripped through a
 * hidden form field without ever existing in plaintext outside this request.
 */
export async function createTwoFactorEnrollmentOffer(accountEmail: string): Promise<TwoFactorEnrollmentOffer> {
  const key = requireEncryptionKey();
  const secret = authenticator.generateSecret();
  const otpAuthUrl = buildOtpAuthUrl({ secret, accountName: accountEmail, issuer: ISSUER });

  return {
    encryptedSecret: encryptTwoFactorSecret(secret, key),
    manualEntryKey: formatSecretForManualEntry(secret),
    otpAuthUrl,
    // Same QR dependency the loyalty card and scan flows already use.
    qrCodeDataUrl: await QRCode.toDataURL(otpAuthUrl, { errorCorrectionLevel: "M", margin: 1, width: 240 }),
  };
}

/** Verifies a code against an encrypted secret without consuming a replay step. */
export function verifyTotpAgainstEncryptedSecret(encryptedSecret: string, token: string): boolean {
  const key = requireEncryptionKey();
  const secret = decryptTwoFactorSecret(encryptedSecret, key);
  if (!secret) return false;

  const normalized = token.replace(/\D/g, "");
  if (normalized.length !== TOTP_DIGITS) return false;

  try {
    return authenticator.check(normalized, secret);
  } catch {
    return false;
  }
}

export type TwoFactorVerificationResult =
  | { ok: true; method: "totp" | "backup-code" }
  | { ok: false; reason: "INVALID" | "REPLAYED" };

/**
 * Verifies a login/step-up challenge for an enrolled user and, on success,
 * consumes it: the TOTP step is recorded (replay guard) or the backup code is
 * marked used (single-use). Accepts a 6-digit TOTP or an unused backup code.
 */
export async function verifyAndConsumeTwoFactorChallenge(userId: number, rawInput: string): Promise<TwoFactorVerificationResult> {
  const key = requireEncryptionKey();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, twoFactorEnabled: true, twoFactorSecret: true, lastTotpStep: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return { ok: false, reason: "INVALID" };
  }

  const digitsOnly = rawInput.replace(/\D/g, "");

  if (digitsOnly.length === TOTP_DIGITS) {
    const secret = decryptTwoFactorSecret(user.twoFactorSecret, key);
    if (!secret) return { ok: false, reason: "INVALID" };

    let valid = false;
    try {
      valid = authenticator.check(digitsOnly, secret);
    } catch {
      valid = false;
    }
    if (!valid) return { ok: false, reason: "INVALID" };

    const step = getTotpStep();
    if (isReplayedTotpStep(user.lastTotpStep, step)) {
      return { ok: false, reason: "REPLAYED" };
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastTotpStep: step } });
    return { ok: true, method: "totp" };
  }

  // Backup code path: hash the normalized input and atomically consume an
  // unused row. updateMany's count tells us whether we won the race, so a code
  // can never be redeemed twice by concurrent requests.
  const codeHash = hashBackupCode(rawInput);
  const consumed = await prisma.twoFactorBackupCode.updateMany({
    where: { userId: user.id, codeHash, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (consumed.count === 0) return { ok: false, reason: "INVALID" };
  return { ok: true, method: "backup-code" };
}

/** Replaces every backup code for a user and returns the new plaintext set (shown once). */
export async function replaceBackupCodes(userId: number): Promise<string[]> {
  const codes = generateBackupCodes(BACKUP_CODE_COUNT);

  await prisma.$transaction(async (tx) => {
    await tx.twoFactorBackupCode.deleteMany({ where: { userId } });
    await tx.twoFactorBackupCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashBackupCode(code) })),
    });
  });

  return codes;
}

export async function countUnusedBackupCodes(userId: number): Promise<number> {
  return prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } });
}

// --- Pending (post-password, pre-2FA) cookie -----------------------------

type PendingPayload = { userId: number; exp: number };

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

/**
 * A short-lived signed marker proving the password step succeeded. It is
 * deliberately separate from the session cookie and carries no role: it grants
 * nothing except the ability to answer the challenge at /login/2fa.
 */
export async function setTwoFactorPendingCookie(userId: number) {
  const payload: PendingPayload = { userId, exp: Math.floor(Date.now() / 1000) + PENDING_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const cookieStore = await cookies();

  cookieStore.set(TWO_FACTOR_PENDING_COOKIE, `${encoded}.${sign(encoded)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_TTL_SECONDS,
  });
}

export async function getTwoFactorPendingUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(TWO_FACTOR_PENDING_COOKIE)?.value;
  if (!value) return null;

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PendingPayload;
    if (typeof payload.userId !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function clearTwoFactorPendingCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TWO_FACTOR_PENDING_COOKIE);
  cookieStore.set(TWO_FACTOR_PENDING_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
