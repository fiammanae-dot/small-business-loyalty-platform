import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform health page is Platform Owner only and informational (no mutations)", () => {
  const page = read("src/app/platform/health/page.tsx");

  assert.match(page, /requireRole\("PLATFORM_OWNER"\)/);
  assert.doesNotMatch(page, /"use server"|prisma\.\w+\.(create|update|delete|upsert)/, "the health page must be read-only");
  assert.match(page, /Informational only/);
});

test("platform health aggregator reports build info, DB, migration, and integration status", () => {
  const health = read("src/lib/platform-health.ts");

  assert.match(health, /appVersion:\s*packageJson\.version/);
  assert.match(health, /gitCommit:\s*process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(health, /getLatestMigration/);
  assert.match(health, /_prisma_migrations/);
  assert.match(health, /googleWallet:\s*\{\s*configured:\s*isGoogleWalletConfigured\(\)/);
  assert.match(health, /environmentValidation:\s*environment/);
  assert.match(health, /sentry:\s*\{\s*configured:\s*isSentryConfigured\(\)/);
  assert.match(health, /backgroundJobs:/);
  assert.match(health, /storage:/);
});

test("env.ts exposes a non-throwing status check shared with the throwing startup validator", () => {
  const env = read("src/lib/env.ts");

  assert.match(env, /export function getEnvironmentStatus/);
  assert.match(env, /function computeMissingRequiredEnv/);
  assert.match(env, /export function validateEnvironment/);
});

test("Platform Health is linked from platform navigation and the operations center", () => {
  const nav = read("src/components/RoleNavigation.tsx");
  const operations = read("src/app/platform/operations-center/page.tsx");

  assert.match(nav, /href:\s*"\/platform\/health"/);
  assert.match(operations, /href="\/platform\/health"/);
});
