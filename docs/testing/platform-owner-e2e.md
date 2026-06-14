# System Administrator End-to-End Journey

Expected outcome:

System Administrator can onboard a new business from start to finish and verify platform operations.

## Preconditions

- System Administrator account exists.
- Database is connected.
- Prisma is connected.
- Subscription plans exist.
- Target environment is confirmed.

## Journey Steps

### 1. Login

Steps:

1. Open `/login`.
2. Enter System Administrator credentials.
3. Submit login form.

Expected:

- User redirects to `/platform`.
- Only Platform navigation is visible.

### 2. View Dashboard

Steps:

1. Open `/platform`.
2. Review KPI cards.
3. Review recent activity.

Expected:

- Dashboard loads without errors.
- Open Alerts KPI is clickable.
- Quick actions are visible.

### 3. Create Business

Steps:

1. Open `/platform/businesses`.
2. Click Create Business.
3. Complete business details.
4. Complete owner account.
5. Complete first branch.
6. Select subscription plan.
7. Configure branding.
8. Review and create.

Expected:

- Business is created.
- Business Owner is created.
- First branch is created.
- Branding is saved.
- Subscription is assigned.

### 4. Assign Plan

Steps:

1. Open created business.
2. Open edit business.
3. Change subscription plan.
4. Save changes.

Expected:

- Plan updates.
- Existing business remains intact.
- Plan limits reflect database values.

### 5. Activate Subscription

Steps:

1. Open `/platform/subscriptions`.
2. Find the new business.
3. Activate subscription or confirm active/trial state.

Expected:

- Subscription status is active or trial.
- Business is not blocked by subscription state.

### 6. View Tenant

Steps:

1. Open `/platform/tenant-center`.
2. Search for created business.
3. Review tenant health and resources.

Expected:

- Tenant appears.
- Owner, plan, branches, programs, customers, and health display.

### 7. View Billing

Steps:

1. Open `/platform/billing-center`.
2. Review business subscription and invoice status.
3. Open `/platform/invoices`.

Expected:

- Billing Center loads.
- Invoices are visible if created.
- No customer PII is exposed.

### 8. View Audit Center

Steps:

1. Open `/platform/audit-center`.
2. Filter by business or action.
3. Open an event detail.

Expected:

- Audit events load.
- Event detail drawer opens.
- Filters work.

### 9. View Analytics

Steps:

1. Open `/platform/health-analytics`.
2. Review aggregate metrics and charts.

Expected:

- Aggregate platform metrics load.
- No customer PII appears.

## Issues To Watch

- Business creation wizard unclear.
- Subscription plan not assigned.
- Business Owner login fails.
- Tenant Center missing created business.
- Audit event missing for major action.
- Duplicate or stale navigation.
