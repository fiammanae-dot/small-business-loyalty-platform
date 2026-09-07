import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * At-rest encryption for per-business WhatsApp access tokens.
 *
 * Same algorithm, payload format, and key handling as the two-factor secret
 * helpers in lib/two-factor-policy - AES-256-GCM, a 32-byte key accepted as
 * base64/hex/utf8, and a `v1.<iv>.<authTag>.<ciphertext>` envelope - so there is
 * one encryption shape to reason about across the codebase. Kept in its own
 * module (and on its own key) so rotating the WhatsApp key never invalidates
 * enrolled 2FA secrets, and vice versa.
 *
 * Deliberately free of runtime imports beyond node:crypto so the behaviour can
 * be tested directly against this source file.
 */

const AES_ALGORITHM = "aes-256-gcm";
const AES_KEY_BYTES = 32;
const AES_IV_BYTES = 12;
const ENCRYPTED_PREFIX = "v1";

export const WHATSAPP_KEY_MISSING_MESSAGE =
  "WhatsApp sending is not configured on this server. Set WHATSAPP_ENCRYPTION_KEY and try again.";

/**
 * Accepts a 32-byte key as base64, hex, or raw utf8. Returns null when absent or
 * the wrong length so callers can fail closed instead of silently downgrading.
 */
export function parseWhatsAppEncryptionKey(rawKey: string | undefined | null): Buffer | null {
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

/** Encrypts an access token for storage. Output: v1.<iv>.<authTag>.<ciphertext>, all base64. */
export function encryptWhatsAppAccessToken(token: string, key: Buffer): string {
  const iv = randomBytes(AES_IV_BYTES);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [ENCRYPTED_PREFIX, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Returns null on any tampering, wrong key, or malformed payload - never throws. */
export function decryptWhatsAppAccessToken(payload: string, key: Buffer): string | null {
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

/** The configured key, or null when the server has none. Callers must fail closed. */
export function getWhatsAppEncryptionKey(): Buffer | null {
  return parseWhatsAppEncryptionKey(process.env.WHATSAPP_ENCRYPTION_KEY);
}

export function isWhatsAppEncryptionConfigured(): boolean {
  return getWhatsAppEncryptionKey() !== null;
}
