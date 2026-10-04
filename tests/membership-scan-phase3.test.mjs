/**
 * Phase 3 - membership at the counter.
 *
 * A prepaid membership counts DOWN, so the scanner says "Use Session" rather
 * than "Issue Stamp", and when the card is used up it offers a renewal instead.
 * renewMembershipAction resets the card to a full set of sessions and restarts
 * the monthly expiry clock, leaving the visit history as the audit trail.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("renewMembershipAction resets a used-up membership to full", () => {
  const actions = read("src/app/scan/actions.ts");
  assert.match(actions, /export async function renewMembershipAction\(formData: FormData\)/);
  // Its own CSRF scope.
  assert.match(actions, /validateCsrfForm\(formData, "scan:membership-renew"\)/);
  // Only memberships can be renewed.
  assert.match(actions, /!programMembership\.loyaltyProgram\.isMembership/);
  // Resets the counters and restarts the monthly clock from today.
  assert.match(actions, /earnedStamps: 0/);
  assert.match(actions, /bonusStamps: 0/);
  assert.match(actions, /sessionsForfeited: 0/);
  assert.match(actions, /forfeitCyclesProcessed: 0/);
  assert.match(actions, /claimedRewardStamps: \{ set: \[\] \}/);
  assert.match(actions, /enrolledAt: new Date\(\)/);
  // Audited and re-synced to the wallet.
  assert.match(actions, /action: "MEMBERSHIP_RENEWED"/);
  assert.match(actions, /syncGoogleWalletObjectAfterLoyaltyChange\(programMembership\.id\)/);
  assert.match(actions, /renewed=1/);
});

test("the scanner says Use Session for memberships and offers renewal when depleted", () => {
  const page = read("src/app/scan/[token]/page.tsx");
  assert.match(page, /import \{[^}]*renewMembershipAction[^}]*\} from "@\/app\/scan\/actions"/);
  // Depletion is computed once and gates the UI.
  assert.match(page, /const membershipDepleted = membershipSummary \? membershipSummary\.remaining <= 0 : false/);
  // Membership wording.
  assert.match(page, /isMembership \? "Use Session" : "Issue Stamp"/);
  assert.match(page, /isMembership \? "Use one session\?" : "Issue stamp\?"/);
  assert.match(page, /isMembership \? "Use Session" : "Add Stamp"/);
  // Renew panel shows only when depleted; the use-session forms hide then.
  assert.match(page, /\{membershipDepleted \? \(\s*<MembershipRenewPanel/);
  assert.match(page, /!redemption && !membershipDepleted \? \(\s*<QuickScanActions/);
  assert.match(page, /!rewardReady && !redemption && !membershipDepleted \? \(\s*<AdvancedStampOptions/);
  // The renew panel posts to the action under its CSRF scope.
  assert.match(page, /scope="scan:membership-renew"/);
  assert.match(page, /action=\{renewMembershipAction\}/);
  // Success banner after a renewal.
  assert.match(page, /qs\.renewed \?/);
});
