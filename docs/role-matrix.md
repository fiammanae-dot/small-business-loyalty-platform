# LoyaltyBase Role and Permission Matrix

Version: 1.0

## Roles

- System Administrator: platform-wide administration, commercial operations, audit visibility.
- Business Owner: full access to one business tenant.
- Branch Manager: branch-scoped operations.
- Staff: limited customer enrollment, scanner, and stamp issuance.

## Permission Matrix

| Area | System Administrator | Business Owner | Branch Manager | Staff |
|---|---|---|---|---|
| Platform dashboard | View/configure | No | No | No |
| Businesses | View/Create/Edit/Disable | Own business only | No | No |
| Plans | View/manage | View current plan | No | No |
| Subscriptions | View/manage | View own billing | No | No |
| Invoices | View/manage | View own billing where exposed | No | No |
| Users | View platform users | Create/edit branch managers and staff | View branch staff where exposed | No |
| Password reset | Platform user management | Branch managers/staff only | No | No |
| Customers | Aggregate only where exposed | View/Create/Edit/Search | View/Create/Search branch-scoped | Create via staff flow |
| Programs | Aggregate only where exposed | View/Create/Edit/Disable | View branch programs | View assigned/visible programs |
| Branches | View/manage tenant metadata | View/Create/Edit/Disable | View own branch | No |
| Scanner | No operational scanning | Open scanner and scan own business | Open scanner and scan own branch/business | Open scanner |
| Stamp issuance | No | Yes | Yes | Yes |
| Reward redemption | No | Yes | Yes | No |
| Referrals | Aggregate/tenant visibility | View center and reports | Limited operational visibility | Customer-facing/link handling only |
| Alerts | Aggregate/no PII goal | Full own-business alert management | Branch-scoped alert visibility/actions | Read-only where exposed |
| Reports/Exports | Platform exports | Business CSV exports | Limited branch reports | No |
| Settings | Platform settings | Business settings/branding/tier/settings | Limited branch settings | No |
| Audit Center | Full platform visibility | No | No | No |
| Billing Center | Full platform visibility | No | No | No |
| Tenant Center | Full platform visibility | No | No | No |

## Can View/Create/Edit/Delete/Approve/Configure

### System Administrator

- Can View: all platform modules, businesses, users, subscriptions, invoices, analytics, audit, billing, tenant center.
- Can Create: businesses, invoices, plans where available, platform users where implemented.
- Can Edit: business status/details, subscription lifecycle, platform settings, invoices/payments.
- Can Delete: no destructive operational delete should be assumed; status/disable/archive patterns preferred.
- Can Approve: commercial/admin lifecycle actions.
- Can Configure: platform settings, demo mode, billing/subscription operations.

### Business Owner

- Can View: business dashboard, customers, programs, branches, staff, referrals, alerts, engagement, messages, billing, settings.
- Can Create: customers, branches, programs, branch managers/staff, messages, exports.
- Can Edit: customers, programs, branches, staff, branding, tier settings, alert settings.
- Can Delete: generally not; disable/status workflows preferred.
- Can Approve: reward redemption, alert workflow, cooldown override where allowed.
- Can Configure: business branding, tier settings, communications, alert/cooldown policies.

### Branch Manager

- Can View: branch dashboard, branch customers, branch programs, scanner.
- Can Create: customers/enrollments within branch scope.
- Can Edit: limited branch/customer/program operations where implemented.
- Can Delete: no.
- Can Approve: reward redemption and allowed operational overrides.
- Can Configure: no broad business settings.

### Staff

- Can View: staff dashboard, scanner, customer enrollment success, programs.
- Can Create: customers through staff enrollment, stamp transactions through scanner.
- Can Edit: no broad edit rights.
- Can Delete: no.
- Can Approve: no reward redemption and no referral manual approval.
- Can Configure: no.

## Security Boundaries

- Business Owner data is filtered by `businessId`.
- Branch Manager data is branch/business scoped.
- Staff cannot redeem rewards or approve referrals.
- System Administrator should avoid customer PII exposure on aggregate screens.
- Authenticated routes use role helpers from `src/lib/session.ts` and `src/lib/roles.ts`.
- Business context loads from `src/lib/business-owner.ts`.

