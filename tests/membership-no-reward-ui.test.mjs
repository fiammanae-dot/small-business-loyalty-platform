/**
 * Memberships are prepaid packages with NO reward. Across every owner-facing
 * surface they must never show reward language (Reward ready / Ready to redeem /
 * Redeem / Near reward / rewards waiting / Issue Stamp) and must count DOWN -
 * the card shows sessions LEFT, so a fresh 6-session package reads "6 of 6",
 * not "0". This pins those invariants on the dashboard, the customer 360 page,
 * the customer list and the scanner, plus the single shared treatment field.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("customer 360 treats a membership as a depleting card with no reward", () => {
  const page = read("src/app/dashboard/customers/[id]/page.tsx");
  // rewardStatusFor short-circuits a membership to "never ready".
  assert.match(page, /if \(programMembership\.loyaltyProgram\.isMembership\) \{\s*return \{ progress, readyRewards: \[\], nextReward: null, rewardReady: false, untilNext: 0 \};/);
  // The Loyalty progress card counts DOWN: filled slots = sessions remaining.
  assert.match(page, /const displayCurrent = sessions \? sessions\.remaining : progress;/);
  assert.match(page, /<StampGrid progress=\{displayCurrent\} required=\{required\} \/>/);
  assert.match(page, /\/ \{required\} \{unitLabel\}/);
  // No reward subtitle / no "Ready to redeem" percent column for a membership.
  assert.match(page, /isMembership \? \(\s*<p[^>]*>.*Prepaid membership/s);
  assert.match(page, /\{isMembership \? null : \(\s*<span[^>]*>\{isRewardReady \? "Ready to redeem"/s);
  // Header CTA says Use Session, not Issue Stamp.
  assert.match(page, /\{primaryIsMembership \? "Use Session" : "Issue Stamp"\}/);
  // In membership mode the Rewards tab is hidden and the stat tile shows sessions.
  assert.match(page, /\.\.\.\(membershipMode\s*\?\s*\[\]\s*:\s*\[\s*\{\s*id: "rewards"/s);
  assert.match(page, /label="Sessions remaining"/);
});

test("the dashboard serve-next queue and reward counts skip memberships", () => {
  const page = read("src/app/dashboard/page.tsx");
  assert.match(page, /isMembership: true,/);
  // Reward-ready count and the "close to reward" count ignore memberships.
  assert.match(page, /const rewardReady = program\.isMembership\s*\?\s*0/);
  assert.match(page, /program\.isMembership \? sum :/);
  // Membership programs never enter the serve-next queue.
  assert.match(page, /if \(program\.isMembership\) continue;/);
});

test("the customer list never marks a membership reward-ready or near-reward", () => {
  const page = read("src/app/dashboard/customers/page.tsx");
  assert.match(page, /isMembership: true,/);
  // Membership rows report no reward state and show sessions remaining.
  assert.match(page, /if \(isMembership\) \{[\s\S]*current: sessions\.remaining,[\s\S]*rewardReady: false,[\s\S]*nearReward: false,/);
  // The Reward-ready / Near-reward filter segments are hidden in membership mode.
  assert.match(page, /\.\.\.\(membershipMode\s*\?\s*\[\]\s*:\s*\[/);
  assert.match(page, /\{membershipMode \? null : <FilterSelect name="reward"/);
});

test("the scanner shows no reward path for a membership and one shared treatment field", () => {
  const page = read("src/app/scan/[token]/page.tsx");
  // A membership is never reward-ready at the counter.
  assert.match(page, /const rewardReady = program\.isMembership \? false : readyRewards\.length > 0;/);
  // The membership branch is a single form (no duplicated treatment block); its
  // two buttons set shareAfterStamp via submitFieldName instead of a second form.
  assert.match(page, /\) : isMembership \? \(/);
  assert.match(page, /<input type="hidden" name="shareAfterStamp" value="" \/>/);
  assert.match(page, /submitFieldName="shareAfterStamp"\s*\n\s*submitFieldValue=""/);
  assert.match(page, /submitFieldName="shareAfterStamp"\s*\n\s*submitFieldValue="whatsapp"/);
});

test("ConfirmSubmitButton can set a shared field before submitting", () => {
  const cmp = read("src/components/ConfirmSubmitButton.tsx");
  assert.match(cmp, /submitFieldName\?: string;/);
  assert.match(cmp, /submitFieldValue\?: string;/);
  assert.match(cmp, /if \(field instanceof HTMLInputElement\) \{\s*field\.value = submitFieldValue;/);
});
