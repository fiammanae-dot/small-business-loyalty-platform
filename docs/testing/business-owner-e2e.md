# Business Owner End-to-End Journey

Expected outcome:

Business Owner can configure the business, create operational users, manage customers, run loyalty programs, review alerts, redeem rewards, prepare messages, and view billing.

## Preconditions

- Business exists.
- Business Owner account exists.
- Subscription is active or trial.
- At least one branch exists.

## Journey Steps

### 1. Login

1. Open `/login`.
2. Login as Business Owner.

Expected:

- User redirects to `/dashboard`.
- Only Business navigation is visible.

### 2. Review Dashboard

1. Review Business Overview.
2. Review KPIs.
3. Review onboarding checklist.
4. Review risk monitoring.

Expected:

- Business name and type display correctly.
- Plan and status display clearly.
- Primary actions are visible.

### 3. Manage Branches

1. Open `/dashboard/branches`.
2. Add a branch if plan limit allows.
3. Edit branch details.
4. Disable and re-enable branch if needed.

Expected:

- Branch limit is enforced.
- Branch belongs to same business.

### 4. Manage Staff

1. Open `/dashboard/staff`.
2. Create Branch Manager.
3. Create Staff user.
4. Assign each user to branch.

Expected:

- Users are linked to own business.
- Staff cannot be created as System Administrator.
- Duplicate email validation works.

### 5. Create Loyalty Program

1. Open `/dashboard/programs`.
2. Create a program.
3. Use template if helpful.
4. Save.

Expected:

- Program appears in list.
- Required stamps and bonus stamps validate.
- Program limit is enforced by plan.

### 6. Create Customer

1. Open `/dashboard/customers`.
2. Create customer.
3. Confirm phone normalization.
4. Open customer profile.

Expected:

- Customer appears in customer list.
- Public card URL exists.
- Customer belongs only to current business.

### 7. Enroll Customer Into Program

1. Open program detail.
2. Open program customers.
3. Enroll customer.

Expected:

- Membership created.
- Bonus stamps applied.
- Progress displays dynamically.
- Scan token exists.

### 8. Review Customer Profile

1. Open customer profile.
2. Review overview, programs, activity, alerts, engagement, messages, redemptions.

Expected:

- Timeline loads.
- Program progress shows whole numbers.
- Card section has open/copy/share actions.

### 9. Review Alerts

1. Open `/dashboard/notifications`.
2. Filter alerts.
3. Assign, review, escalate, resolve, or dismiss.

Expected:

- Alerts are business-scoped.
- Risk score and priority display.
- Audit history remains intact.

### 10. Prepare Message

1. Open `/dashboard/engagement`.
2. Open engagement event.
3. Prepare message.
4. Open `/dashboard/messages`.

Expected:

- Message is queued as READY.
- No real provider send occurs.
- Consent rules are enforced.

### 11. View Billing

1. Open `/dashboard/billing`.
2. Review invoices.

Expected:

- Business Owner sees own invoices only.
- Page is read-only.

## Issues To Watch

- Dashboard too dense.
- Branch/program limits unclear.
- Staff user cannot log in.
- Customer profile too complex.
- Alert workflow unclear.
- Message preparation mistaken as automatic sending.
