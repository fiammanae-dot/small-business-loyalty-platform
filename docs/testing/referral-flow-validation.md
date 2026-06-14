# Referral Flow Validation

Use this document to validate referral behavior without changing referral logic.

## Preconditions

- Referrer customer exists.
- Referrer has a public card.
- Referral code exists.
- Staff account exists.
- Loyalty program exists.

## Referral Link Opens

Steps:

1. Open customer card.
2. Copy referral link.
3. Open referral link in a new browser.

Expected:

- Referral page opens.
- Business and customer context display safely.
- No private customer data is exposed.

## Customer Joins

Steps:

1. Use referral context.
2. Staff enrolls referred customer.

Expected:

- Referred customer is created or reused.
- Pending referral is linked automatically.

## Pending Referral Created

Verify:

- Referral status is Pending.
- Referral is visible to Business Owner.
- Staff cannot manually approve.

## First Stamp Qualifies Referral

Steps:

1. Staff scans referred customer's card.
2. Staff issues first stamp.

Expected:

- Referral becomes Qualified.
- First stamp branch is recorded.
- Referral event is audited.

## Reward Granted

Expected:

- Referral reward is granted according to program configuration.
- Default reward is bonus stamps if not changed.
- Reward grant is auditable.

## Self-Referral Blocked

Steps:

1. Attempt to enroll customer using own referral.

Expected:

- Self-referral is blocked.
- Event is audited.
- No reward is granted.

## Duplicate Referral Blocked

Steps:

1. Attempt to create duplicate referral for same referred membership.

Expected:

- Duplicate is blocked.
- Existing referral remains unchanged.

## Referral Status Visible

Verify:

- Pending referrals display.
- Qualified referrals display.
- Rewards earned display.
- Top referrers display on dashboard where available.

## Issues To Record

- Referral link unclear.
- Customer does not understand referral page.
- Staff workflow does not preserve referral context.
- Referral qualification timing is confusing.
