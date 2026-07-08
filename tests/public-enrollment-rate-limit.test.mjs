import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("shared rate-limit module exposes a generic, reusable public-endpoint limiter", () => {
  const rateLimit = read("src/lib/rate-limit.ts");

  assert.match(rateLimit, /export function windowStart/);
  assert.match(rateLimit, /export function isOverThreshold/);
  assert.match(rateLimit, /export async function isPublicActionRateLimited/);
  assert.match(rateLimit, /export async function recordPublicActionAttempt/);
  assert.match(rateLimit, /prisma\.rateLimitAttempt\.count/);
  assert.match(rateLimit, /prisma\.rateLimitAttempt\.create/);
});

test("login-protection reuses the shared window/threshold helpers instead of duplicating them", () => {
  const loginProtection = read("src/lib/login-protection.ts");

  assert.match(loginProtection, /import\s*\{[^}]*windowStart[^}]*\}\s*from\s*"@\/lib\/rate-limit"/);
  assert.match(loginProtection, /import\s*\{[^}]*isOverThreshold[^}]*\}\s*from\s*"@\/lib\/rate-limit"/);
  assert.doesNotMatch(loginProtection, /function sinceWindow/, "login-protection should no longer define its own duplicate window helper");
});

test("public program enrollment is rate limited by IP and join token without changing enrollment behavior", () => {
  const joinActions = read("src/app/join/program/[token]/actions.ts");

  assert.match(joinActions, /import\s*\{[^}]*isPublicActionRateLimited[^}]*recordPublicActionAttempt[^}]*\}\s*from\s*"@\/lib\/rate-limit"/);
  assert.match(joinActions, /scope:\s*JOIN_PROGRAM_RATE_LIMIT_SCOPE/);
  assert.match(joinActions, /isPublicActionRateLimited\(\{/);
  assert.match(joinActions, /identifier:\s*parsed\.data\.token/);
  assert.match(joinActions, /recordPublicActionAttempt\(\{/);
  assert.match(joinActions, /enrollmentSource:\s*"SELF_SIGNUP"/, "existing enrollment business logic must be unchanged");
});

test("RateLimitAttempt is an additive Prisma model dedicated to public rate limiting", () => {
  const schema = read("prisma/schema.prisma");

  assert.match(schema, /model RateLimitAttempt \{[\s\S]*scope\s+String[\s\S]*ip_address[\s\S]*outcome\s+String[\s\S]*@@map\("rate_limit_attempts"\)/);
});
