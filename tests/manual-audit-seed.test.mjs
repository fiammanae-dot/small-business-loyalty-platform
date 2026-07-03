import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const manualAuditSeed = readFileSync("prisma/seed-manual-audit.js", "utf8");
const pilotSeed = readFileSync("prisma/seed-pilot.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const seedingGuide = readFileSync("docs/operations/database-seeding-guide.md", "utf8");

test("manual audit seed exists and is separate from pilot seed", () => {
  assert.equal(existsSync("prisma/seed-manual-audit.js"), true);
  assert.notEqual(manualAuditSeed, pilotSeed);
  assert.match(packageJson.scripts["prisma:seed-manual-audit"], /seed-manual-audit\.js/);
  assert.match(packageJson.scripts["prisma:seed-pilot"], /seed-pilot\.js/);
});

test("manual audit seed is protected from accidental pilot or production execution", () => {
  assert.match(manualAuditSeed, /MANUAL_AUDIT_SEED_CONFIRM/);
  assert.match(manualAuditSeed, /Loyalty Card UAE_MANUAL_AUDIT/);
  assert.match(manualAuditSeed, /FORBIDDEN_DATABASES = new Set\(\["loyalty_platform_pilot"\]\)/);
  assert.match(manualAuditSeed, /APP_ENV === "production"/);
  assert.match(manualAuditSeed, /VERCEL_ENV === "production"/);
  assert.match(manualAuditSeed, /Refusing to seed protected database/);
});

test("manual audit seed covers realistic full-platform QA data", () => {
  assert.match(manualAuditSeed, /Manual Audit Coffee House/);
  assert.match(manualAuditSeed, /Manual Audit Gulf Bistro/);
  assert.match(manualAuditSeed, /Manual Audit Shine Car Wash/);
  assert.match(manualAuditSeed, /STARTER/);
  assert.match(manualAuditSeed, /GROWTH/);
  assert.match(manualAuditSeed, /MULTI_BRANCH/);
  assert.match(manualAuditSeed, /BUSINESS_OWNER/);
  assert.match(manualAuditSeed, /BRANCH_MANAGER/);
  assert.match(manualAuditSeed, /STAFF/);
  assert.match(manualAuditSeed, /BRONZE/);
  assert.match(manualAuditSeed, /SILVER/);
  assert.match(manualAuditSeed, /GOLD/);
  assert.match(manualAuditSeed, /VIP/);
  assert.match(manualAuditSeed, /ensureReferral/);
  assert.match(manualAuditSeed, /ensureScanEvent/);
  assert.match(manualAuditSeed, /ensureRewardRedemption/);
  assert.match(manualAuditSeed, /ensureInvoice/);
  assert.match(manualAuditSeed, /ensureAlert/);
  assert.match(manualAuditSeed, /ensureNotification/);
});

test("manual audit seed documentation explains command and safety", () => {
  assert.match(seedingGuide, /Manual Audit Seed/);
  assert.match(seedingGuide, /npm run prisma:seed-manual-audit/);
  assert.match(seedingGuide, /MANUAL_AUDIT_SEED_CONFIRM="Loyalty Card UAE_MANUAL_AUDIT"/);
  assert.match(seedingGuide, /refuses to run against `loyalty_platform_pilot`/);
  assert.match(seedingGuide, /not be used for pilot production onboarding/);
});
