/**
 * Phase 3: membership sessions are prepaid and expire one per unused month.
 *
 * The arithmetic lives in one helper so the scan display, the customer profile
 * and the monthly cron never disagree. These checks hold the wiring in place:
 * the helper exists, the cron uses it under the shared secret, the schema and a
 * migration carry the counters, and the schedule is registered.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("session math helper exposes the count-down summary and the forfeit engine", () => {
  const helper = read("src/lib/membership-sessions.ts");
  assert.match(helper, /export function membershipSessionSummary/);
  assert.match(helper, /export function computeMembershipForfeit/);
  // Remaining never drops below zero.
  assert.match(helper, /Math\.max\(0, total - used - forfeited\)/);
  // A cycle is only judged once it has fully elapsed, and only unused months forfeit.
  assert.match(helper, /if \(input\.now < cycleEnd\) break;/);
  assert.match(helper, /if \(!visitedThisCycle\)/);
});

test("the monthly cron is secret-protected and delegates to the helper", () => {
  const cron = read("src/app/api/cron/membership-expiry/route.ts");
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /timingSafeEqual/);
  assert.match(cron, /computeMembershipForfeit/);
  assert.match(cron, /isMembership: true/);
  assert.match(cron, /MEMBERSHIP_SESSION_FORFEITED/);
});

test("the forfeit schedule is registered in vercel.json", () => {
  const vercel = read("vercel.json");
  assert.match(vercel, /\/api\/cron\/membership-expiry/);
});

test("the schema and a migration carry the session counters", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /sessions_forfeited/);
  assert.match(schema, /forfeit_cycles_processed/);
  const migration = read("prisma/migrations/0056_membership_monthly_forfeit/migration.sql");
  assert.match(migration, /ADD COLUMN "sessions_forfeited"/);
  assert.match(migration, /ADD COLUMN "forfeit_cycles_processed"/);
});

test("a prepaid membership with no sessions left cannot be stamped again", () => {
  const scanActions = read("src/app/scan/actions.ts");
  assert.match(scanActions, /membershipSessionSummary/);
  assert.match(scanActions, /no sessions left/);
});
