import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Pure two-factor policy: crypto primitives, encoding, and the enrollment /
 * enforcement decisions. Only `node:crypto` is imported, so this module can be
 * transpiled and imported directly by the Node 20 test runner (same pattern as
 * src/lib/authz-policy.ts). Everything that needs Prisma, cookies, otplib, or
 * env access lives in src/lib/two-factor.ts instead.
 */

// Standard TOTP parameters (RFC 6238): 6 digits, 30s step, +/-1 step of drift.
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_WINDOW_STEPS = 1;

export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_GROUP_LENGTH = 5;
/** Crockford-style alphabet: no 0/O/1/I/L to avoid transcription mistakes. */
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Only these roles may enrol in 2FA (product decision, mirrored by the UI and actions). */
export const TWO_FACTOR_ROLES = ["PLATFORM_OWNER", "BUSINESS_OWNER"] as const;
export type TwoFactorRole = (typeof TWO_FACTOR_ROLES)[number];

export function canUseTwoFactor(role: string): role is TwoFactorRole {
  return (TWO_FACTOR_ROLES as readonly string[]).includes(role);
}

export const TWO_FACTOR_KEY_MISSING_MESSAGE =
  "Two-factor authentication is not configured on this server. Set TWO_FACTOR_ENCRYPTION_KEY and try again.";

// --- Secret encryption (AES-256-GCM) -------------------------------------

const AES_ALGORITHM = "aes-256-gcm";
const AES_KEY_BYTES = 32;
const AES_IV_BYTES = 12;
const ENCRYPTED_PREFIX = "v1";

/**
 * Accepts a 32-byte key as base64, hex, or raw utf8. Returns null when absent or
 * the wrong length so callers can fail closed instead of silently downgrading.
 */
export function parseTwoFactorEncryptionKey(rawKey: string | undefined | null): Buffer | null {
  const value = rawKey?.trim();
  if (!value) return null;

  for (const encoding of ["base64", "hex"] as const) {
    try {
      const decoded = Buffer.from(value, encoding);
      if (decoded.length === AES_KEY_BYTES) return decoded;
    } catch {
      // Try the next encoding.
    }
  }

  const utf8 = Buffer.from(value, "utf8");
  return utf8.length === AES_KEY_BYTES ? utf8 : null;
}

/** Encrypts a TOTP secret for storage. Output: v1.<iv>.<authTag>.<ciphertext>, all base64. */
export function encryptTwoFactorSecret(secret: string, key: Buffer): string {
  const iv = randomBytes(AES_IV_BYTES);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [ENCRYPTED_PREFIX, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Returns null on any tampering, wrong key, or malformed payload — never throws. */
export function decryptTwoFactorSecret(payload: string, key: Buffer): string | null {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== ENCRYPTED_PREFIX) return null;

  try {
    const decipher = createDecipheriv(AES_ALGORITHM, key, Buffer.from(parts[1], "base64"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// --- Backup codes --------------------------------------------------------

/** Formats as XXXXX-XXXXX. Codes are single-use and shown to the user only once. */
export function generateBackupCode(): string {
  const pick = () =>
    Array.from({ length: BACKUP_CODE_GROUP_LENGTH }, () => BACKUP_CODE_ALPHABET[randomInt(BACKUP_CODE_ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateBackupCode());
  return Array.from(codes);
}

/** Accepts user input with any casing, spaces, or missing dash. */
export function normalizeBackupCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Backup codes are high-entropy random values (not user-chosen passwords), so a
 * fast one-way hash is the right primitive here — bcrypt's work factor buys
 * nothing against a 50-bit random string and would slow every login attempt.
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

// --- TOTP step / replay --------------------------------------------------

export function getTotpStep(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
}

/**
 * Replay guard: a TOTP code stays valid for its whole 30s step (and the drift
 * window), so a code observed once must never be accepted again. Any step at or
 * below the last accepted one is rejected.
 */
export function isReplayedTotpStep(lastAcceptedStep: number | null | undefined, candidateStep: number): boolean {
  if (lastAcceptedStep === null || lastAcceptedStep === undefined) return false;
  return candidateStep <= lastAcceptedStep;
}

/** Constant-time string comparison that never leaks length via early return. */
export function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    // Still burn a comparison so callers cannot time the length check itself.
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

// --- otpauth:// provisioning URI -----------------------------------------

export function buildOtpAuthUrl({ secret, accountName, issuer }: { secret: string; accountName: string; issuer: string }): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Groups the base32 secret into 4-character blocks for manual entry. */
export function formatSecretForManualEntry(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? [secret]).join(" ");
}

// --- Enforcement ---------------------------------------------------------

export type TwoFactorRequirement = {
  requireTwoFactorPlatformOwner: boolean;
  requireTwoFactorBusinessOwner: boolean;
};

export const DEFAULT_TWO_FACTOR_REQUIREMENT: TwoFactorRequirement = {
  requireTwoFactorPlatformOwner: false,
  requireTwoFactorBusinessOwner: false,
};

export function isTwoFactorRequiredForRole(role: string, requirement: TwoFactorRequirement): boolean {
  if (role === "PLATFORM_OWNER") return requirement.requireTwoFactorPlatformOwner;
  if (role === "BUSINESS_OWNER") return requirement.requireTwoFactorBusinessOwner;
  // BRANCH_MANAGER and STAFF are never subject to the admin 2FA switches.
  return false;
}

/**
 * The enforcement decision mirrored from `forcePasswordChange`: when a role's
 * switch is on and that user has not enrolled, they must finish setup before
 * using the rest of the app. Defaults are off, so nothing changes until an
 * administrator flips a switch.
 */
export function requiresTwoFactorSetup(
  user: { role: string; twoFactorEnabled: boolean },
  requirement: TwoFactorRequirement,
): boolean {
  if (user.twoFactorEnabled) return false;
  return isTwoFactorRequiredForRole(user.role, requirement);
}
