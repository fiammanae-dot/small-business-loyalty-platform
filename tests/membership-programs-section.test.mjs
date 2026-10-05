/**
 * The Programs section (list, detail, program-customers) must not show reward
 * language for prepaid memberships - no "Reward Ready" tiles, badges, columns
 * or filters - and the status label reads "Membership complete" when a
 * membership card is full instead of "Reward Ready".
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("programCustomerStatusLabel never says Reward Ready for a membership", () => {
  const s = read("src/lib/programs.ts");
  assert.match(s, /isMembership\?: boolean/);
  assert.match(s, /isMembership \? "Membership complete" : "Reward Ready"/);
});

test("the programs list drops reward tiles/filter and counts for memberships", () => {
  const p = read("src/app/dashboard/programs/page.tsx");
  assert.match(p, /const membershipMode = Boolean\(business\.membershipSettings\?\.enabled\)/);
  assert.match(p, /const rewardReadyCount = program\.isMembership\s*\?\s*0/);
  assert.match(p, /\{membershipMode \? null : \(\s*<MetricCard label="Reward Ready Customers"/s);
  assert.match(p, /\{membershipMode \? null : <FilterSelect name="reward"/);
  assert.match(p, /\{membershipMode \? "Package" : "Reward"\}/);
  assert.match(p, /\{membershipMode \? "Sessions" : "Rewards"\}/);
});

test("the program detail page swaps reward tiles for sessions on a membership", () => {
  const p = read("src/app/dashboard/programs/[id]/page.tsx");
  assert.match(p, /const isMembership = program\.isMembership/);
  assert.match(p, /const rewardReadyCustomers = isMembership\s*\?\s*0/);
  assert.match(p, /isMembership \? \(\s*<MetricCard label="Sessions Used"/s);
  assert.match(p, /requiredStamps: safeRequiredStamps, isMembership \}/);
});

test("the program customers page hides the Reward Ready column for a membership", () => {
  const p = read("src/app/dashboard/programs/[id]/customers/page.tsx");
  assert.match(p, /isMembership: boolean;/);
  assert.match(p, /const isMembership = program\.isMembership/);
  assert.match(p, /\{isMembership \? null : <DataTableHeadCell>Reward Ready<\/DataTableHeadCell>\}/);
  assert.match(p, /const rewardReady = !isMembership && progress >= program\.requiredStamps/);
});
