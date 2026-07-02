import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const script = readFileSync("scripts/seed-full-qa.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("full QA seed command is registered", () => {
  assert.equal(packageJson.scripts["seed:full-qa"], "node scripts/seed-full-qa.js");
});

test("full QA seed requires explicit destructive reset guards", () => {
  assert.match(script, /NODE_ENV\s*===\s*"production"/);
  assert.match(script, /ALLOW_QA_RESET:\s*"true"/);
  assert.match(script, /QA_DATABASE:\s*"true"/);
  assert.match(script, /CONFIRM_FULL_DATA_WIPE:\s*"true"/);
  assert.match(script, /THIS WILL DELETE ALL CURRENT USERS, BUSINESSES, CUSTOMERS, PROGRAMS, TRANSACTIONS, AND QA DATA\./);
});

test("full QA seed preserves Prisma migration history during wipe", () => {
  assert.match(script, /table_name\s*<>\s*'_prisma_migrations'/);
  assert.match(script, /TRUNCATE TABLE/);
  assert.match(script, /RESTART IDENTITY CASCADE/);
});

test("full QA seed creates the requested QA tenants and shared-phone cases", () => {
  assert.match(script, /Emirates Coffee House/);
  assert.match(script, /QuickFix Auto Garage/);
  assert.match(script, /admin@loyaltybase\.test/);
  assert.match(script, /\+971501111111/);
  assert.match(script, /Ahmed Ali/);
  assert.match(script, /Mr Ahmed/);
  assert.match(script, /qa-credentials\.csv/);
});
