/**
 * Membership card (Phase 2): a prepaid membership card is issued FULL and
 * depletes - the filled slots represent sessions the customer has LEFT, and
 * the card reads "N of Y sessions left" with no reward, then "Membership
 * complete" at zero. This covers the web hero card, the secondary program
 * cards and the Google Wallet pass header.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the render model treats a membership as a depleting card with no reward", () => {
  const model = read("src/lib/card-render-model.ts");
  // New input channel for prepaid sessions.
  assert.match(model, /membership\?: \{ sessionsRemaining: number; totalSessions: number \} \| null/);
  assert.match(model, /const isMembership = Boolean\(input\.membership\)/);
  // Filled slots = sessions remaining, not sessions used.
  assert.match(model, /const current = isMembership \? membershipRemaining/);
  assert.match(model, /const required = isMembership \? membershipTotal/);
  // No reward for a membership.
  assert.match(model, /const rewardReady = isMembership \? false/);
  // Status wording counts down and ends at "Membership complete".
  assert.match(model, /session\$\{membershipTotal === 1 \? "" : "s"\} left/);
  assert.match(model, /"Membership complete"/);
  // The reward box is suppressed for memberships.
  assert.match(model, /rewardBox: design\.visibleSections\.rewardBox && hasProgram && !isMembership/);
  // The returned design itself carries rewardBox:false for memberships, so the
  // hero wallet card (which re-reads model.design) hides it too.
  assert.match(model, /const outputDesign = needsSuppressedDesign/);
  assert.match(model, /rewardBox: isMembership \? false : design\.visibleSections\.rewardBox/);
});

test("the public card page feeds membership sessions into the model", () => {
  const page = read("src/app/card/[token]/page.tsx");
  assert.match(page, /import \{ membershipSessionSummary \} from "@\/lib\/membership-sessions"/);
  // Membership branch computes the session summary and counts down.
  assert.match(page, /const summary = membershipSessionSummary\(\{/);
  assert.match(page, /sessionsForfeited: programMembership\.sessionsForfeited/);
  assert.match(page, /progress: sessionsRemaining/);
  assert.match(page, /rewardReady: false/);
  // Passes the membership channel into the hero model.
  assert.match(page, /membership:\s*\n\s*primaryProgram\?\.isMembership/);
  // Hero statusText + reward box suppression wired through.
  assert.match(page, /statusText: primaryCardModel\.progress\.statusText/);
  // Secondary cards know they're memberships.
  assert.match(page, /isMembership=\{isMembership\}/);
});

test("the wallet hero and program cards render the membership wording", () => {
  const hero = read("src/components/public-card/LoyaltyWalletCard.tsx");
  assert.match(hero, /statusText\?: string/);
  assert.match(hero, /const statusText = statusTextProp \?\?/);

  const prog = read("src/components/public-card/ProgramRewardCard.tsx");
  assert.match(prog, /isMembership\?: boolean/);
  assert.match(prog, /Prepaid membership/);
  assert.match(prog, /"Used up"/);
  assert.match(prog, /Show to use a session\./);
});

test("the Google Wallet pass header depletes for a membership", () => {
  const mapper = read("src/lib/google-wallet/mapper.ts");
  assert.match(mapper, /import \{ membershipSessionSummary \} from "@\/lib\/membership-sessions"/);
  assert.match(mapper, /const isMembership = membership\.loyaltyProgram\.isMembership/);
  // The pass's main header slot counts sessions left.
  assert.match(mapper, /label: "Sessions left"/);
  assert.match(mapper, /string: `\$\{sessionsRemaining\} of \$\{sessionsTotal\}`/);
  // The filled stamp image uses remaining, not collected.
  assert.match(mapper, /const walletFilled = isMembership \? sessionsRemaining/);
  // The class describes the package, not a reward.
  assert.match(mapper, /membershipClassBody\(membership\)/);
});
