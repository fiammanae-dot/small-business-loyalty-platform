# End-to-End User Journey Testing

This folder contains Phase 13D validation documents for Loyalty Card UAE.

The goal is to validate complete workflows from the perspective of real users before pilot onboarding.

## Documents

- `platform-owner-e2e.md`: System Administrator business onboarding and operations journey.
- `business-owner-e2e.md`: Business Owner setup, customer, program, billing, and alert journey.
- `branch-manager-e2e.md`: Branch Manager branch operations journey.
- `staff-e2e.md`: Staff enrollment, scanner, and stamp issuance journey.
- `customer-e2e.md`: Public customer card and referral journey.
- `cross-role-permissions-e2e.md`: negative tests for role access and tenant isolation.
- `e2e-findings-log.md`: template for recording UX gaps, permission issues, broken navigation, and bottlenecks.
- `pilot-e2e-master-checklist.md`: complete checklist for pilot readiness sign-off.

## Device QA

- `device-test-matrix.md`: desktop, Android, and iPhone browser support matrix.
- `mobile-responsiveness-checklist.md`: mobile checks for navigation, filters, tables, cards, forms, modals, charts, and horizontal scrolling.
- `scanner-validation.md`: camera permission, QR detection, invalid QR, disabled QR, wrong-business QR, and stamp flow validation.
- `customer-card-validation.md`: customer card branding, membership, loyalty progress, QR, referral, and layout checks.
- `referral-flow-validation.md`: referral link, pending referral, first-stamp qualification, reward grant, self-referral, and duplicate-referral checks.
- `role-device-testing.md`: role-by-role device testing for System Administrator, Business Owner, Branch Manager, Staff, and Customer.
- `mobile-performance-checklist.md`: performance targets for dashboard, scanner, customer card, referral page, and large lists.
- `pilot-device-signoff.md`: final PASS / PASS WITH NOTES / FAIL sign-off form.
- `device-qa-findings-log.md`: issue log for device, browser, severity, workaround, and resolution.

## Testing Rules

- Do not modify production or pilot data without approval.
- Prefer development database `loyalty_platform` for validation.
- Use pilot database `loyalty_platform_pilot` only when explicitly approved.
- Do not run seed scripts unless testing requires fresh data and approval is given.
- Record every issue in `e2e-findings-log.md`.

## Pass Criteria

Phase 13D is ready when:

- System Administrator can onboard a business from start to finish.
- Business Owner can configure and operate their business.
- Branch Manager can scan, issue stamps, and redeem rewards where allowed.
- Staff can enroll customers, scan cards, and issue stamps.
- Customers can open cards and share referrals.
- Wrong-role access is blocked.
- Cross-business data is not exposed.

## Recommended Real-Device Testing Sequence

1. Complete `device-test-matrix.md`.
2. Run `mobile-responsiveness-checklist.md`.
3. Run `scanner-validation.md` on Android Chrome and iPhone Safari.
4. Run `customer-card-validation.md`.
5. Run `referral-flow-validation.md`.
6. Run `role-device-testing.md`.
7. Run `mobile-performance-checklist.md`.
8. Record issues in `device-qa-findings-log.md`.
9. Complete `pilot-device-signoff.md`.
