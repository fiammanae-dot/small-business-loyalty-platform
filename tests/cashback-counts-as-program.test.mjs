import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

// Cashback is a business-wide program that occupies one slot in the plan's
// program limit. These tests lock in that it is counted consistently wherever
// program usage is shown or enforced across the platform.

test("shared helper counts cashback as one program toward the limit", () => {
  const lib = read("src/lib/subscriptions.ts");
  assert.match(lib, /export function programsUsedTowardLimit\(/);
  assert.match(lib, /loyaltyProgramCount \+ \(cashbackEnabled \? 1 : 0\)/);
});

test("billing plan usage counts cashback in Programs used", () => {
  const page = read("src/components/billing/BillingCenter.tsx");
  assert.match(page, /programsUsedTowardLimit\(business\._count\.loyaltyPrograms, Boolean\(business\.cashbackSettings\?\.enabled\)\)/);
  // still driven by the loyalty program count plus cashback, not a hard-coded number
  assert.match(page, /business\._count\.loyaltyPrograms/);
});

test("dashboard account usage bar counts cashback as a program", () => {
  const page = read("src/app/dashboard/page.tsx");
  assert.match(page, /programsUsedTowardLimit\(loyaltyPrograms, Boolean\(business\.cashbackSettings\?\.enabled\)\)/);
});

test("creating a loyalty program counts cashback against the plan limit", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  assert.match(actions, /programsUsedTowardLimit\(loyaltyProgramCount, Boolean\(cashback\?\.enabled\)\)/);
  assert.match(actions, /businessCashbackSettings\.findUnique/);
});

test("enabling cashback is blocked when the program limit is already full", () => {
  const actions = read("src/app/dashboard/actions.ts");
  // guard only fires on a disabled -> enabled transition
  assert.match(actions, /if \(!existing\?\.enabled\) \{/);
  assert.match(actions, /programsUsedTowardLimit\(loyaltyProgramCount, true\) > maxPrograms/);
  assert.match(actions, /limitReachedMessage\("program", maxPrograms\)/);
});

test("platform tenant center counts cashback in the Programs tile", () => {
  const page = read("src/app/platform/tenant-center/page.tsx");
  assert.match(page, /tenant\.loyaltyPrograms\.length \+ \(tenant\.cashbackSettings\?\.enabled \? 1 : 0\)/);
  assert.match(page, /cashbackSettings: \{ select: \{ enabled: true \} \}/);
});
