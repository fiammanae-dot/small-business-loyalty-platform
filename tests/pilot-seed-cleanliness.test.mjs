import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

const pilotSeed = read("prisma/seed-pilot.js");
const demoSeed = read("prisma/seed-demo.js");
const readme = read("README.md");
const seedingGuide = read("docs/operations/database-seeding-guide.md");

test("pilot seed is restricted to the pilot database and approved baseline records", () => {
  assert.match(pilotSeed, /PILOT_DATABASE_NAME = "loyalty_platform_pilot"/);
  assert.match(pilotSeed, /Refusing to seed database/);
  assert.match(pilotSeed, /PILOT_SYSTEM_ADMIN_EMAIL/);
  assert.match(pilotSeed, /PILOT_SEED_PASSWORD/);
  assert.match(pilotSeed, /role: "PLATFORM_OWNER"/);
  assert.match(pilotSeed, /STARTER/);
  assert.match(pilotSeed, /GROWTH/);
  assert.match(pilotSeed, /MULTI_BRANCH/);
  assert.match(pilotSeed, /key: "demo_mode"/);
  assert.match(pilotSeed, /enabled: false/);
  assert.match(pilotSeed, /messageTemplates/);
  assert.match(pilotSeed, /customerNotificationTemplates/);
});

test("pilot seed does not create fake operational data", () => {
  assert.doesNotMatch(pilotSeed, /pilotBusinesses/);
  assert.doesNotMatch(pilotSeed, /Orange Demo Cafe|Harbor Coffee House|Cedar Table Restaurant|Sharp Line Barbershop/);
  assert.doesNotMatch(pilotSeed, /owner@|manager@|staff@|\.example/);
  assert.doesNotMatch(pilotSeed, /prisma\.business\.upsert|prisma\.branch\.upsert|prisma\.loyaltyProgram\.upsert/);
  assert.doesNotMatch(pilotSeed, /prisma\.globalCustomer\.upsert|businessCustomerMembership|customerProgramMembership/);
  assert.doesNotMatch(pilotSeed, /prisma\.(stampTransaction|scanEvent|activityAlert|invoice)/);
  assert.doesNotMatch(pilotSeed, /prisma\.businessSubscription\.(create|upsert|update)/);
  assert.doesNotMatch(pilotSeed, /generateCardToken|generateScanToken|normalizePhone/);
});

test("demo seed remains isolated for local testing only", () => {
  assert.match(demoSeed, /DEMO_SEED_PASSWORD/);
  assert.match(demoSeed, /DEMO_OWNER_EMAIL/);
  assert.match(demoSeed, /Orange Demo Cafe/);
  assert.match(demoSeed, /prisma\.business\.upsert/);
  assert.match(demoSeed, /createMissingStampTransaction/);
  assert.match(demoSeed, /createMissingAlert/);
});

test("database seeding documentation explains pilot, demo, and safe local reset commands", () => {
  assert.equal(existsSync("docs/operations/database-seeding-guide.md"), true);
  assert.match(seedingGuide, /npm run prisma:seed-pilot/);
  assert.match(seedingGuide, /npm run prisma:seed-demo/);
  assert.match(seedingGuide, /loyalty_platform_pilot/);
  assert.match(seedingGuide, /Never use `prisma migrate reset`/);
  assert.match(readme, /Database Seeding Modes/);
  assert.match(readme, /docs\/operations\/database-seeding-guide\.md/);
});