# Browser E2E Test Plan

This plan covers critical browser-based user journeys for LoyaltyBase.

## System Administrator Journeys

1. Login as System Administrator.
2. Open Platform Operations Center.
3. Create a business.
4. Assign subscription plan.
5. Verify tenant appears in Tenant Center.
6. Open Audit Center.
7. Open Billing Center.
8. Create invoice.
9. Record manual payment.
10. Check Launch Readiness.

## Business Owner Journeys

1. Login as Business Owner.
2. Open dashboard.
3. Create branch within plan limit.
4. Create staff user.
5. Create loyalty program.
6. Create customer.
7. Enroll customer into program.
8. Open customer card.
9. Review alerts.
10. Prepare a message.
11. Export CSV report.

## Branch Manager Journeys

1. Login as Branch Manager.
2. Open branch dashboard.
3. View organization-level customers.
4. Open scanner.
5. Scan valid QR.
6. Issue stamp.
7. Redeem reward if ready.
8. Confirm branch-scoped access.

## Staff Journeys

1. Login as Staff.
2. Open staff dashboard.
3. Enroll customer.
4. Open scanner.
5. Scan valid QR.
6. Issue one stamp.
7. Attempt restricted redemption and confirm blocked.

## Customer Journeys

1. Open public card.
2. Confirm business branding.
3. Confirm masked phone.
4. Confirm loyalty progress.
5. Copy referral link.
6. View QR code.

## Negative Tests

- Business Owner cannot access Platform pages.
- Branch Manager cannot access Business Owner pages.
- Staff cannot access Branch Manager pages.
- Staff from Business A cannot scan Business B QR.
- Disabled card shows unavailable.
- Invalid QR shows clean error.
- Suspended business is blocked from critical actions.

## Sign-Off Criteria

- All critical journeys pass.
- No role sees another business data.
- No browser console errors during scanner workflow.
- Mobile layout is usable.
- Pilot user can complete daily workflow without developer help.
