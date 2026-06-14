# Cross-Role Permissions And Tenant Isolation E2E

Expected outcome:

Each role can access only its allowed surfaces, and each business sees only its own data.

## System Administrator

Allowed:

- `/platform`
- `/platform/businesses`
- `/platform/subscriptions`
- `/platform/invoices`
- `/platform/audit-center`
- `/platform/billing-center`
- `/platform/tenant-center`
- `/platform/settings`

Expected:

- System Administrator has aggregate operational access.
- System Administrator should not see customer PII in aggregate analytics.

## Business Owner

Allowed:

- `/dashboard`
- `/dashboard/customers`
- `/dashboard/programs`
- `/dashboard/notifications`
- `/dashboard/messages`
- `/dashboard/billing`

Blocked:

- `/platform`
- Other business customer profiles.
- Other business invoices.
- Other business alerts.

## Branch Manager

Allowed:

- `/branch`
- `/branch/customers`
- `/branch/programs`
- `/branch/scanner`

Blocked:

- `/platform`
- `/dashboard`
- Other business customers.
- Other business scan tokens.

## Staff

Allowed:

- `/staff`
- `/staff/scanner`
- `/staff/customers/new`
- `/staff/programs`

Blocked:

- `/platform`
- `/dashboard`
- `/branch`
- Reward redemption.
- Program editing.
- Alert management.

## Tenant Isolation Tests

Test:

1. Business A customer cannot be viewed by Business B.
2. Business A program cannot be viewed by Business B.
3. Staff from Business A cannot scan Business B QR.
4. Branch Manager from Business A cannot enroll into Business B program.
5. Business Owner A cannot view Business B alerts.
6. Business Owner A cannot view Business B billing.
7. Business Owner A cannot redeem Business B reward.

Expected:

- Access is denied, redirected, or shows safe error.
- No internal IDs or sensitive details leak.
