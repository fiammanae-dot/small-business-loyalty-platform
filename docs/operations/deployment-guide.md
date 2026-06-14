# Deployment Guide

This guide describes how to deploy LoyaltyBase for a pilot or production-like environment.

## Environment Setup

Required runtime:

- Node.js compatible with the project dependencies
- PostgreSQL
- npm
- Prisma CLI through project dependencies

Recommended environments:

- Development: `loyalty_platform`
- Pilot: `loyalty_platform_pilot`
- Production: dedicated managed PostgreSQL database

## Required Environment Variables

Create a secure `.env` file for the target environment.

Required:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
SESSION_SECRET=strong-random-secret
```

Production rules:

- `SESSION_SECRET` must be present.
- Never reuse a local development secret.
- Never commit `.env`.
- Confirm the database name before running migrations.

## Pre-Deployment Checklist

1. Confirm the target database.
2. Back up the database.
3. Confirm pending migrations.
4. Confirm dependencies install cleanly.
5. Confirm test, lint, and build pass locally.

Commands:

```powershell
npm install
npx prisma generate
npx prisma migrate status
npm test
npm run lint
npm run build
```

## Database Migrations

Run migrations only after confirming the target database and backup.

```powershell
npx prisma migrate deploy
```

Then regenerate Prisma Client:

```powershell
npx prisma generate
```

## Build Commands

```powershell
npm run build
```

## Startup Commands

Development:

```powershell
npm run dev
```

Production-style:

```powershell
npm run build
npm run start
```

## Validation Steps

After deployment:

1. Open `/login`.
2. Sign in as System Administrator.
3. Open `/platform/settings`.
4. Confirm Environment Information.
5. Open `/platform/database`.
6. Confirm Database Connected and Prisma Connected.
7. Open `/platform/launch-readiness`.
8. Test one Business Owner login.
9. Test one Branch Manager login.
10. Test one Staff login.
11. Open a public customer card.
12. Validate scanner and stamp workflow in a test business.

## Smoke Test URLs

- `/`
- `/login`
- `/platform`
- `/platform/settings`
- `/platform/health-analytics`
- `/platform/audit-center`
- `/platform/billing-center`
- `/platform/tenant-center`
- `/dashboard`
- `/branch`
- `/staff`

## Deployment Sign-Off

Deployment is ready when:

- Tests pass.
- Lint passes.
- Build passes.
- Migrations are up to date.
- Login works for all roles.
- Platform health pages load.
- Scanner opens.
- No production secrets are exposed.
