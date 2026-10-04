/**
 * Membership programs (Phase 1): a program is created as one of two modes -
 * a normal "collect stamps -> reward" card, or a "membership - prepaid
 * sessions" card. Membership mode drops the reward fields and requires the
 * owner to list the included treatments. The decrement/session accounting
 * itself is unchanged (see membership-sessions + the scan flow).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the create wizard presents an explicit two-mode choice", () => {
  const wiz = read("src/components/ProgramCreateWizard.tsx");
  assert.match(wiz, /Program type/);
  assert.match(wiz, /Collect stamps/);
  assert.match(wiz, /Membership &mdash; prepaid sessions/);
  // One hidden input submits the chosen mode (no more bolted-on checkbox).
  assert.match(wiz, /<input type="hidden" name="isMembership" value=\{isMembership \? "true" : "false"\} \/>/);
  // Required-stamps input is relabelled by mode.
  assert.match(wiz, /isMembership \? "Number of included sessions" : "Required stamps"/);
  // Reward + milestones + starting stamps only show for the normal card.
  assert.match(wiz, /\{!isMembership \? \(/);
  // Membership details (price + treatments) only show for membership.
  assert.match(wiz, /\{isMembership \? \(/);
  assert.match(wiz, /name="membershipTreatments"/);
  assert.match(wiz, /name="priceAmount"/);
});

test("the schema makes rewards optional for memberships but requires a treatment", () => {
  const prog = read("src/lib/programs.ts");
  assert.match(prog, /rewardName: z\.string\(\)\.trim\(\)\.default\(""\)/);
  assert.match(prog, /rewardDescription: z\.string\(\)\.trim\(\)\.default\(""\)/);
  // Reward required only when NOT a membership.
  assert.match(prog, /data\.isMembership \|\| data\.rewardName\.length >= 1/);
  assert.match(prog, /data\.isMembership \|\| data\.rewardDescription\.length >= 1/);
  // A membership must list at least one included treatment.
  assert.match(prog, /!data\.isMembership \|\| data\.membershipTreatments\.length >= 1/);
});

test("create/update actions store a reward placeholder for memberships and skip milestones", () => {
  const act = read("src/app/dashboard/programs/actions.ts");
  const placeholders = act.match(/parsed\.data\.rewardName \|\| "Membership complete"/g) ?? [];
  assert.equal(placeholders.length, 2, "both create and update default the reward for memberships");
  assert.match(act, /parsed\.data\.isMembership \? \[\] : milestonesFromForm/);
});
