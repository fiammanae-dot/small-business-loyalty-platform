# Recovery Priority Matrix

This matrix defines response priority for Loyalty Card UAE incidents.

## P1 - Production Down

Definition:

Production application or database is unavailable for commercial users.

Response Goal:

Begin response immediately.

Recovery Action:

- Stop failing deployment if recent.
- Restore previous app release.
- Use database restore only with explicit approval.
- Communicate status to affected customers.

Who Approves:

- System Administrator
- Technical Owner
- Database Owner if restore is required

Verification:

- Login works.
- Database health is connected.
- Core dashboards load.
- Scanner works.
- Customer cards open.

## P2 - Pilot Database Unavailable

Definition:

Pilot users cannot access pilot data or pilot workflows.

Response Goal:

Begin response within 30 minutes.

Recovery Action:

- Confirm `loyalty_platform_pilot` connectivity.
- Check PostgreSQL service.
- Restore pilot database to temporary database if needed.
- Switch only after pilot owner approval.

Who Approves:

- System Administrator
- Pilot Operations Owner

Verification:

- Pilot System Administrator login.
- Pilot Business Owner login.
- Pilot customer cards open.
- Scanner works.

## P3 - Development Database Broken

Definition:

Development or QA database is corrupted or unavailable.

Response Goal:

Resolve same day.

Recovery Action:

- Restore latest development backup.
- If acceptable, recreate development database from migrations and seed data.
- Keep pilot database untouched.

Who Approves:

- Technical Owner

Verification:

- Tests pass.
- Development login works.
- Core workflows load.

## P4 - Single User/Data Issue

Definition:

One user, business, customer, invoice, or alert has an issue while platform remains operational.

Response Goal:

Triage within one business day.

Recovery Action:

- Review Audit Center.
- Review affected records.
- Avoid direct data edits unless approved.
- Prefer app-level correction workflows.

Who Approves:

- System Administrator
- Business Owner if business-specific

Verification:

- Affected user confirms resolution.
- Audit record is preserved.
- No unrelated tenants affected.
