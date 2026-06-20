# Database Seeding Guide

This guide separates clean pilot setup from local demo data. Never use demo seeding for pilot or production databases.

## Clean Pilot Database Seed

Use this when preparing `loyalty_platform_pilot` for real pilot onboarding.

Expected result:

- 1 System Administrator account
- 3 official subscription plans: `STARTER`, `GROWTH`, `MULTI_BRANCH`
- Platform setting `demo_mode=false`
- Global system message and customer notification templates
- 0 businesses
- 0 branches
- 0 business owners
- 0 branch managers
- 0 staff users
- 0 customers
- 0 loyalty programs
- 0 referrals
- 0 alerts
- 0 scanner activity
- 0 subscriptions
- 0 invoices

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/loyalty_platform_pilot?schema=public"
PILOT_SYSTEM_ADMIN_EMAIL="admin@yourdomain.com"
PILOT_SEED_PASSWORD="temporary-password-to-change-immediately"
```

Command:

```bash
npm run prisma:seed-pilot
```

Safety behavior:

- The pilot seed refuses to run unless `DATABASE_URL` points to `loyalty_platform_pilot`.
- It does not create fake tenants or customer activity.
- It does not run migrations or reset the database.

## Local Demo Seed

Use this only for local development and UI testing when fake operational data is useful.

Demo seed creates a demo business, branches, operational users, customers, programs, stamp transactions, and alerts.

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/loyalty_platform?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DEMO_SEED_PASSWORD="local-demo-password"
DEMO_OWNER_EMAIL="demo.owner@example.test"
DEMO_MANAGER_EMAIL="demo.manager@example.test"
DEMO_STAFF_EMAIL="demo.staff@example.test"
```

Command:

```bash
npm run prisma:seed-demo
```

Do not run this command against `loyalty_platform_pilot`, Neon, Vercel production, or any real pilot/customer database.

## Standard System Seed

Use this for a clean local or production-style baseline when you only need the System Administrator, official plans, and system templates.

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/loyalty_platform?schema=public"
SEED_ADMIN_EMAIL="admin@yourdomain.com"
SEED_ADMIN_PASSWORD="temporary-password-to-change-immediately"
```

Command:

```bash
npm run prisma:seed
```

## Safe Local Test Data Reset

For local testing only, use backups first and never run destructive resets on pilot or production databases.

Recommended safe process:

1. Confirm the active `DATABASE_URL` database name.
2. Create a backup with `pg_dump`.
3. Run migrations if needed.
4. Delete only local operational/demo data using a reviewed cleanup script or manual SQL transaction.
5. Re-run either `npm run prisma:seed` or `npm run prisma:seed-demo` depending on the testing need.
6. Verify counts before opening the app.

Expected clean local baseline after a safe reset:

- System Administrators: 1
- Businesses: 0
- Branches: 0
- Customers: 0
- Programs: 0
- Business subscriptions: 0
- Alerts: 0
- Stamp transactions: 0
- Scan events: 0
- Subscription plans: 3

Never use `prisma migrate reset`, forced database resets, or seed-demo commands against production, Neon, or `loyalty_platform_pilot` unless a separate backup and approval process explicitly allows it.