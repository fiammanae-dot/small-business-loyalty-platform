import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("forgot password and reset password routes exist and are linked from login", () => {
  assert.equal(existsSync("src/app/forgot-password/page.tsx"), true);
  assert.equal(existsSync("src/app/forgot-password/actions.ts"), true);
  assert.equal(existsSync("src/app/reset-password/page.tsx"), true);
  assert.equal(existsSync("src/app/reset-password/actions.ts"), true);

  const loginForm = read("src/components/LoginForm.tsx");
  const forgotPage = read("src/app/forgot-password/page.tsx");
  const resetPage = read("src/app/reset-password/page.tsx");

  assert.match(loginForm, /href="\/forgot-password"/);
  assert.match(loginForm, /Forgot Password\?/);
  assert.match(forgotPage, /Send Reset Link|Reset your password/);
  assert.match(resetPage, /reset links expire after 30 minutes/i);
});

test("password reset tokens are stored hashed, expire, and are single-use", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0026_password_reset_tokens/migration.sql");
  const resetLib = read("src/lib/password-reset.ts");

  assert.match(schema, /model PasswordResetToken/);
  assert.match(schema, /tokenHash\s+String\s+@unique\s+@map\("token_hash"\)/);
  assert.match(schema, /expiresAt\s+DateTime\s+@map\("expires_at"\)/);
  assert.match(schema, /usedAt\s+DateTime\?\s+@map\("used_at"\)/);
  assert.match(schema, /passwordResetTokens PasswordResetToken\[\]/);

  assert.match(migration, /CREATE TABLE "password_reset_tokens"/);
  assert.match(migration, /"token_hash" TEXT NOT NULL/);
  assert.match(migration, /"expires_at" TIMESTAMP\(3\) NOT NULL/);
  assert.match(migration, /"used_at" TIMESTAMP\(3\)/);
  assert.match(migration, /REFERENCES "users"\("id"\) ON DELETE CASCADE/);

  assert.match(resetLib, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(resetLib, /createHash\("sha256"\)\.update\(token\)\.digest\("hex"\)/);
  assert.match(resetLib, /PASSWORD_RESET_EXPIRES_IN_MINUTES = 30/);
  assert.match(resetLib, /resetToken\.usedAt/);
  assert.match(resetLib, /resetToken\.expiresAt <= new Date\(\)/);
  assert.match(resetLib, /updateMany\(\{\s*where: \{\s*userId: resetToken\.userId,\s*usedAt: null/s);
});

test("password reset validates password strength, hashes password, and invalidates sessions", () => {
  const resetLib = read("src/lib/password-reset.ts");

  assert.match(resetLib, /password\.length < 8/);
  assert.match(resetLib, /\[a-z\]/);
  assert.match(resetLib, /\[A-Z\]/);
  assert.match(resetLib, /\[0-9\]/);
  assert.match(resetLib, /\[\^A-Za-z0-9\]/);
  assert.match(resetLib, /bcrypt\.hash\(newPassword, 12\)/);
  assert.match(resetLib, /passwordChangedAt: changedAt/);
  assert.match(resetLib, /forcePasswordChange: false/);
  assert.match(resetLib, /sessionVersion: \{ increment: 1 \}/);
});

test("password reset requests use generic messaging, rate limiting, Resend email template, and audit events", () => {
  const forgotActions = read("src/app/forgot-password/actions.ts");
  const resetActions = read("src/app/reset-password/actions.ts");
  const resetLib = read("src/lib/password-reset.ts");
  const email = read("src/lib/password-reset-email.ts");

  assert.match(forgotActions, /If an account exists for this email/);
  assert.match(forgotActions, /headers\(\)/);
  assert.match(resetActions, /headers\(\)/);

  assert.match(resetLib, /PASSWORD_RESET_REQUEST_LIMIT = 5/);
  assert.match(resetLib, /PASSWORD_RESET_REQUEST_WINDOW_MINUTES = 15/);
  assert.match(resetLib, /PASSWORD_RESET_REQUESTED/);
  assert.match(resetLib, /PASSWORD_RESET_COMPLETED/);
  assert.match(resetLib, /PASSWORD_RESET_RATE_LIMITED/);
  assert.match(resetLib, /ipAddress: meta\.ipAddress/);
  assert.match(resetLib, /userAgent: meta\.userAgent/);
  assert.match(resetLib, /getConfiguredAppUrl/);

  assert.match(email, /Reset Your Loyalty Card UAE Password/);
  assert.match(email, /Reset Password/);
  assert.match(email, /expires in/);
  assert.match(email, /RESEND_API_KEY/);
  assert.match(email, /PASSWORD_RESET_FROM_EMAIL/);
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /Authorization|authorization/);
});
