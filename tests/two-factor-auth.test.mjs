import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { authenticator } from "otplib";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

// CI runs `node --test` on Node 20, which cannot import .ts directly. Same
// pattern as tests/authz-guards.test.mjs: transpile the real pure policy module
// and import it as an in-memory ES module, so these are behavioral tests
// against the shipped implementation rather than a copy of it.
const policySource = read("src/lib/two-factor-policy.ts");
assert.doesNotMatch(
  policySource,
  /^import (?!type )(?!.*from "node:)/m,
  "src/lib/two-factor-policy.ts may only import node: builtins at runtime so its behavioral tests can run on CI's Node 20",
);
const transpiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const policy = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

const KEY = Buffer.alloc(32, 7);

// The same TOTP parameters src/lib/two-factor.ts configures otplib with.
const TOTP_BASE_OPTIONS = {
  digits: policy.TOTP_DIGITS,
  step: policy.TOTP_PERIOD_SECONDS,
  window: policy.TOTP_WINDOW_STEPS,
};

function restoreRealClock() {
  authenticator.resetOptions();
  authenticator.options = TOTP_BASE_OPTIONS;
}

// --- Secret encryption ---------------------------------------------------

test("TOTP secrets round-trip through AES-256-GCM and never appear in the stored payload", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const encrypted = policy.encryptTwoFactorSecret(secret, KEY);

  assert.ok(encrypted.startsWith("v1."), "payload should be versioned");
  assert.doesNotMatch(encrypted, /JBSWY3DPEHPK3PXP/, "plaintext secret must never appear in the stored value");
  assert.equal(policy.decryptTwoFactorSecret(encrypted, KEY), secret);
});

test("encryption is non-deterministic, so two enrollments never produce the same ciphertext", () => {
  const first = policy.encryptTwoFactorSecret("JBSWY3DPEHPK3PXP", KEY);
  const second = policy.encryptTwoFactorSecret("JBSWY3DPEHPK3PXP", KEY);
  assert.notEqual(first, second);
});

test("decryption fails closed on a wrong key, tampering, or a malformed payload", () => {
  const encrypted = policy.encryptTwoFactorSecret("JBSWY3DPEHPK3PXP", KEY);

  assert.equal(policy.decryptTwoFactorSecret(encrypted, Buffer.alloc(32, 9)), null, "wrong key");

  const parts = encrypted.split(".");
  const tamperedCipher = Buffer.from(parts[3], "base64");
  tamperedCipher[0] ^= 0xff;
  parts[3] = tamperedCipher.toString("base64");
  assert.equal(policy.decryptTwoFactorSecret(parts.join("."), KEY), null, "GCM auth tag must reject tampering");

  assert.equal(policy.decryptTwoFactorSecret("not-a-payload", KEY), null);
  assert.equal(policy.decryptTwoFactorSecret("v2.a.b.c", KEY), null, "unknown version");
});

test("the encryption key must be exactly 32 bytes, in base64, hex, or utf8", () => {
  assert.equal(policy.parseTwoFactorEncryptionKey(undefined), null);
  assert.equal(policy.parseTwoFactorEncryptionKey(""), null);
  assert.equal(policy.parseTwoFactorEncryptionKey("too-short"), null);

  assert.equal(policy.parseTwoFactorEncryptionKey(KEY.toString("base64"))?.length, 32);
  assert.equal(policy.parseTwoFactorEncryptionKey(KEY.toString("hex"))?.length, 32);
  assert.equal(policy.parseTwoFactorEncryptionKey("a".repeat(32))?.length, 32);
});

// --- TOTP validity / expiry / replay -------------------------------------

test("a current TOTP code validates, and a code from a different secret does not", () => {
  restoreRealClock();
  const secret = authenticator.generateSecret();
  const otherSecret = authenticator.generateSecret();
  const token = authenticator.generate(secret);

  assert.equal(authenticator.check(token, secret), true);
  assert.equal(authenticator.check(token, otherSecret), false, "a code is only valid for its own secret");
  assert.equal(authenticator.check("000000", secret), false, "an arbitrary 6-digit string is not accepted");
});

test("a code from far outside the drift window is rejected as expired", () => {
  const secret = authenticator.generateSecret();

  // otplib's `options` setter MERGES, so an `epoch` override survives a plain
  // reassignment; resetOptions() is required to get back to the real clock.
  const generateAt = (offsetMs) => {
    authenticator.resetOptions();
    authenticator.options = { ...TOTP_BASE_OPTIONS, epoch: Date.now() + offsetMs };
    const token = authenticator.generate(secret);
    restoreRealClock();
    return token;
  };

  const staleToken = generateAt(-10 * policy.TOTP_PERIOD_SECONDS * 1000);
  assert.equal(authenticator.check(staleToken, secret), false, "a 5-minute-old code must not be accepted");

  const previousStepToken = generateAt(-policy.TOTP_PERIOD_SECONDS * 1000);
  assert.equal(authenticator.check(previousStepToken, secret), true, "+/-1 step of drift is tolerated");
});

test("the shared step size matches what the TOTP library is configured with", () => {
  const now = 1_800_000_000_000;
  assert.equal(policy.getTotpStep(now), Math.floor(now / 1000 / 30));
  assert.equal(policy.TOTP_PERIOD_SECONDS, 30);
  assert.equal(policy.TOTP_DIGITS, 6);
  assert.equal(policy.TOTP_WINDOW_STEPS, 1);
});

test("replay protection rejects a step already used, and any earlier step", () => {
  const step = policy.getTotpStep();

  assert.equal(policy.isReplayedTotpStep(null, step), false, "first ever use is allowed");
  assert.equal(policy.isReplayedTotpStep(undefined, step), false, "never-enrolled users are allowed");
  assert.equal(policy.isReplayedTotpStep(step, step), true, "same step is a replay");
  assert.equal(policy.isReplayedTotpStep(step, step - 1), true, "an older step is a replay");
  assert.equal(policy.isReplayedTotpStep(step, step + 1), false, "the next step is fresh");
});

// --- Backup codes --------------------------------------------------------

test("backup codes are unique, formatted, and drawn from an unambiguous alphabet", () => {
  const codes = policy.generateBackupCodes();

  assert.equal(codes.length, policy.BACKUP_CODE_COUNT);
  assert.equal(new Set(codes).size, codes.length, "codes must be unique");
  for (const code of codes) {
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
    assert.doesNotMatch(code, /[01OIL]/, "ambiguous characters must be excluded");
  }
});

test("backup codes hash consistently regardless of user formatting", () => {
  const code = "ABCDE-FGHJK";
  const expected = policy.hashBackupCode(code);

  assert.equal(policy.hashBackupCode("abcde-fghjk"), expected, "case-insensitive");
  assert.equal(policy.hashBackupCode(" ABCDE FGHJK "), expected, "spaces and dashes ignored");
  assert.equal(policy.hashBackupCode("ABCDEFGHJK"), expected, "dash optional");
  assert.notEqual(policy.hashBackupCode("ABCDE-FGHJM"), expected, "a different code hashes differently");
  assert.match(expected, /^[0-9a-f]{64}$/, "sha256 hex digest");
});

test("timing-safe comparison returns correct results for equal, different, and unequal-length inputs", () => {
  assert.equal(policy.timingSafeEqualString("abc123", "abc123"), true);
  assert.equal(policy.timingSafeEqualString("abc123", "abc124"), false);
  assert.equal(policy.timingSafeEqualString("abc", "abcdef"), false, "must not throw on length mismatch");
  assert.equal(policy.timingSafeEqualString("", ""), true);
});

// --- otpauth provisioning ------------------------------------------------

test("the otpauth URL carries the standard parameters and encodes the account label", () => {
  const url = policy.buildOtpAuthUrl({ secret: "JBSWY3DPEHPK3PXP", accountName: "owner@example.com", issuer: "Loyalty Card UAE" });
  const parsed = new URL(url);

  assert.equal(parsed.protocol, "otpauth:");
  assert.match(url, /^otpauth:\/\/totp\/Loyalty%20Card%20UAE:owner%40example\.com\?/);
  assert.equal(parsed.searchParams.get("secret"), "JBSWY3DPEHPK3PXP");
  assert.equal(parsed.searchParams.get("issuer"), "Loyalty Card UAE");
  assert.equal(parsed.searchParams.get("digits"), "6");
  assert.equal(parsed.searchParams.get("period"), "30");
});

// --- Roles and enforcement ----------------------------------------------

test("only PLATFORM_OWNER and BUSINESS_OWNER may enrol in two-factor authentication", () => {
  assert.equal(policy.canUseTwoFactor("PLATFORM_OWNER"), true);
  assert.equal(policy.canUseTwoFactor("BUSINESS_OWNER"), true);
  assert.equal(policy.canUseTwoFactor("BRANCH_MANAGER"), false);
  assert.equal(policy.canUseTwoFactor("STAFF"), false);
});

test("enforcement defaults are off, so nothing changes until an admin flips a switch", () => {
  const defaults = policy.DEFAULT_TWO_FACTOR_REQUIREMENT;
  assert.deepEqual(defaults, { requireTwoFactorPlatformOwner: false, requireTwoFactorBusinessOwner: false });

  for (const role of ["PLATFORM_OWNER", "BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"]) {
    assert.equal(policy.requiresTwoFactorSetup({ role, twoFactorEnabled: false }, defaults), false, role);
  }
});

test("a required-but-not-enrolled user is gated, and enrolling clears the gate", () => {
  const requirement = { requireTwoFactorPlatformOwner: true, requireTwoFactorBusinessOwner: true };

  assert.equal(policy.requiresTwoFactorSetup({ role: "PLATFORM_OWNER", twoFactorEnabled: false }, requirement), true);
  assert.equal(policy.requiresTwoFactorSetup({ role: "BUSINESS_OWNER", twoFactorEnabled: false }, requirement), true);
  assert.equal(policy.requiresTwoFactorSetup({ role: "PLATFORM_OWNER", twoFactorEnabled: true }, requirement), false);
  assert.equal(policy.requiresTwoFactorSetup({ role: "BUSINESS_OWNER", twoFactorEnabled: true }, requirement), false);
});

test("operational roles are never gated, even when both admin switches are on", () => {
  const requirement = { requireTwoFactorPlatformOwner: true, requireTwoFactorBusinessOwner: true };

  for (const role of ["BRANCH_MANAGER", "STAFF"]) {
    assert.equal(policy.isTwoFactorRequiredForRole(role, requirement), false, role);
    assert.equal(policy.requiresTwoFactorSetup({ role, twoFactorEnabled: false }, requirement), false, role);
  }
});

test("each role switch is independent", () => {
  const platformOnly = { requireTwoFactorPlatformOwner: true, requireTwoFactorBusinessOwner: false };

  assert.equal(policy.isTwoFactorRequiredForRole("PLATFORM_OWNER", platformOnly), true);
  assert.equal(policy.isTwoFactorRequiredForRole("BUSINESS_OWNER", platformOnly), false);
});

// --- Wiring: login gate, enrollment, enforcement -------------------------

test("password success hands off to the second factor without creating a session", () => {
  const login = read("src/app/login/actions.ts");

  const twoFactorBranch = login.indexOf("if (user.twoFactorEnabled)");
  const sessionCreation = login.indexOf("await createSession({ id: user.id, role: user.role })");
  assert.ok(twoFactorBranch > -1, "login must branch on twoFactorEnabled");
  assert.ok(twoFactorBranch < sessionCreation, "the 2FA redirect must come before createSession");

  assert.match(login, /await setTwoFactorPendingCookie\(user\.id\);\s*redirect\("\/login\/2fa"\)/);
  // Users without 2FA keep the exact original final redirect.
  assert.match(login, /redirect\(user\.forcePasswordChange \? "\/change-password" : roleHomePath\[user\.role\]\)/);
});

test("the 2FA challenge consumes the pending cookie, rate-limits, and only then creates the session", () => {
  const challenge = read("src/app/login/2fa/actions.ts");

  assert.match(challenge, /validateCsrfForm\(formData, "login:2fa"\)/);
  assert.match(challenge, /getTwoFactorPendingUserId\(\)/);
  assert.match(challenge, /isLoginTemporarilyLocked\(user\.email\)/);
  assert.match(challenge, /recordFailedLogin\(user\.email, "FAILED"\)/);
  assert.match(challenge, /verifyAndConsumeTwoFactorChallenge\(user\.id, submitted\)/);

  const verification = challenge.indexOf("verifyAndConsumeTwoFactorChallenge");
  const session = challenge.indexOf("await createSession(");
  assert.ok(verification < session, "the session may only be created after the code verifies");
  assert.match(challenge, /await clearTwoFactorPendingCookie\(\);\s*await createSession/);
});

test("the pending cookie is separate from the session cookie and short-lived", () => {
  const twoFactor = read("src/lib/two-factor.ts");
  const session = read("src/lib/session.ts");

  assert.match(twoFactor, /TWO_FACTOR_PENDING_COOKIE = "loyalty_2fa_pending"/);
  assert.match(session, /SESSION_COOKIE = "loyalty_session"/);
  assert.match(twoFactor, /PENDING_TTL_SECONDS = 5 \* 60/);
  assert.match(twoFactor, /httpOnly: true/);
  // It carries a user id and expiry only - no role, so it cannot stand in for a session.
  assert.match(twoFactor, /type PendingPayload = \{ userId: number; exp: number \}/);
});

test("two-factor endpoints fail closed when the encryption key is absent", () => {
  const twoFactor = read("src/lib/two-factor.ts");

  assert.match(twoFactor, /class TwoFactorNotConfiguredError/);
  assert.match(twoFactor, /function requireEncryptionKey\(\): Buffer \{\s*const key = parseTwoFactorEncryptionKey\(process\.env\.TWO_FACTOR_ENCRYPTION_KEY\);\s*if \(!key\) throw new TwoFactorNotConfiguredError\(\);/);
  assert.match(policySource, /TWO_FACTOR_KEY_MISSING_MESSAGE/);
});

test("backup codes are consumed atomically so a code can never be used twice", () => {
  const twoFactor = read("src/lib/two-factor.ts");

  assert.match(twoFactor, /twoFactorBackupCode\.updateMany\(\{\s*where: \{ userId: user\.id, codeHash, usedAt: null \},\s*data: \{ usedAt: new Date\(\) \},/);
  assert.match(twoFactor, /if \(consumed\.count === 0\) return \{ ok: false, reason: "INVALID" \}/);
  // Only the hash is ever persisted.
  assert.match(twoFactor, /codeHash: hashBackupCode\(code\)/);
  assert.doesNotMatch(twoFactor, /codeHash: code[,)]/);
});

test("the TOTP path records the step it accepted, closing the replay window", () => {
  const twoFactor = read("src/lib/two-factor.ts");

  assert.match(twoFactor, /if \(isReplayedTotpStep\(user\.lastTotpStep, step\)\) \{\s*return \{ ok: false, reason: "REPLAYED" \};/);
  assert.match(twoFactor, /prisma\.user\.update\(\{ where: \{ id: user\.id \}, data: \{ lastTotpStep: step \} \}\)/);
});

test("enrollment actions are CSRF-protected and limited to the two admin roles", () => {
  const actions = read("src/app/account/two-factor/actions.ts");

  for (const action of ["confirmTwoFactorAction", "disableTwoFactorAction", "regenerateBackupCodesAction"]) {
    assert.match(actions, new RegExp(`export async function ${action}`), action);
  }
  assert.equal((actions.match(/validateCsrfForm\(formData, CSRF_SCOPE\)/g) ?? []).length, 3, "every mutation validates CSRF");
  assert.match(actions, /if \(!canUseTwoFactor\(user\.role\)\) redirect\("\/"\)/);

  // Enabling requires proving the app works; disabling requires a code or the password.
  assert.match(actions, /verifyTotpAgainstEncryptedSecret\(encryptedSecret, code\)/);
  assert.match(actions, /bcrypt\.compare\(password, record\.passwordHash\)/);
  // Disabling clears the secret and every backup code.
  assert.match(actions, /twoFactorEnabled: false, twoFactorSecret: null, twoFactorActivatedAt: null, lastTotpStep: null/);
  assert.match(actions, /twoFactorBackupCode\.deleteMany\(\{ where: \{ userId: user\.id \} \}\)/);
});

test("the setup page avoids the redirect loop by not using requireRole, like /change-password", () => {
  const setupPage = read("src/app/account/two-factor/setup/page.tsx");
  const changePasswordPage = read("src/app/change-password/page.tsx");

  assert.match(changePasswordPage, /getCurrentUser\(\)/);
  assert.match(setupPage, /const user = await getCurrentUser\(\);\s*if \(!user\) redirect\("\/login"\)/);
  // No *invocation* of the redirecting guards (mentions in comments are fine).
  assert.doesNotMatch(setupPage, /await require(Role|BusinessOwner)\(/);
});

test("enforcement mirrors the forcePasswordChange gate in requireRole", () => {
  const session = read("src/lib/session.ts");

  // The pre-existing gate is untouched...
  assert.match(session, /if \(user\.forcePasswordChange\) \{\s*redirect\("\/change-password"\)/);
  // ...and the 2FA gate sits immediately after it, using the same shape.
  assert.match(session, /if \(await requiresTwoFactorEnrollment\(user\)\) \{\s*redirect\("\/account\/two-factor\/setup"\)/);
  assert.match(session, /twoFactorEnabled: user\.twoFactorEnabled/);
});

test("the requirement setting is stored per role and defaults to off", () => {
  const platformSettings = read("src/lib/platform-settings.ts");
  const settingsActions = read("src/app/platform/settings/actions.ts");

  assert.match(platformSettings, /TWO_FACTOR_REQUIREMENT_SETTING_KEY = "two_factor_requirement"/);
  assert.match(platformSettings, /requireTwoFactorPlatformOwner: record\.requireTwoFactorPlatformOwner === true/);
  assert.match(platformSettings, /requireTwoFactorBusinessOwner: record\.requireTwoFactorBusinessOwner === true/);
  assert.match(platformSettings, /return DEFAULT_TWO_FACTOR_REQUIREMENT/);

  assert.match(settingsActions, /export async function setTwoFactorRequirementAction/);
  assert.match(settingsActions, /await requirePlatformAdmin\(\)/);
  assert.match(settingsActions, /TWO_FACTOR_REQUIREMENT_ENABLED/);
  assert.match(settingsActions, /TWO_FACTOR_REQUIREMENT_DISABLED/);
});

test("enrollment UI is exposed to both admin roles and reuses the existing QR dependency", () => {
  const twoFactor = read("src/lib/two-factor.ts");
  const platformSettings = read("src/app/platform/settings/page.tsx");
  const businessSettings = read("src/app/dashboard/settings/page.tsx");

  assert.match(twoFactor, /import QRCode from "qrcode"/, "must reuse the app's existing QR library");
  assert.match(twoFactor, /QRCode\.toDataURL\(otpAuthUrl/);
  assert.match(platformSettings, /\/account\/two-factor\/setup/);
  assert.match(businessSettings, /\/account\/two-factor\/setup/);
  // The old hardcoded placeholder is gone.
  assert.doesNotMatch(businessSettings, /Two-factor status" value="Not available"/);
});

test("the migration is additive and backward compatible", () => {
  const migration = read("prisma/migrations/0045_admin_two_factor_auth/migration.sql");
  const schema = read("prisma/schema.prisma");

  assert.match(migration, /ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /ADD COLUMN "two_factor_secret" TEXT;/, "nullable, no default");
  assert.match(migration, /ADD COLUMN "two_factor_activated_at" TIMESTAMP\(3\);/);
  assert.match(migration, /ADD COLUMN "last_totp_step" INTEGER;/);
  assert.match(migration, /CREATE TABLE "two_factor_backup_codes"/);
  assert.match(migration, /ON DELETE CASCADE/);
  // Nothing destructive.
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER COLUMN[\s\S]*SET NOT NULL/);

  assert.match(schema, /model TwoFactorBackupCode/);
  assert.match(schema, /twoFactorEnabled\s+Boolean\s+@default\(false\) @map\("two_factor_enabled"\)/);
  assert.match(schema, /twoFactorSecret\s+String\?\s+@map\("two_factor_secret"\)/);
});

test("the encryption key is documented as required-for-2FA and optional otherwise", () => {
  const envExample = read(".env.example");

  assert.match(envExample, /TWO_FACTOR_ENCRYPTION_KEY=""/);
  assert.match(envExample, /32-byte key/);
  assert.match(envExample, /fail closed/);
});
