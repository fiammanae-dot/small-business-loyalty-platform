# Deployment Runbook

This runbook describes the standard deployment process for Loyalty Card UAE.

## Pre-Deployment Checklist

Complete this checklist before deploying:

- Confirm target environment.
- Confirm target database.
- Confirm `.env` points to the correct database.
- Confirm `SESSION_SECRET` is set for pilot or production.
- Confirm latest source code is present.
- Confirm database backup exists.
- Confirm no unapproved seed scripts will run.
- Confirm deployment owner is available.
- Confirm rollback plan is known.

## Required Environment Variables

Required:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
SESSION_SECRET=strong-random-secret
```

Optional operational values may be added later for provider integrations, monitoring, or hosting.

Expected validation:

- `DATABASE_URL` database name matches the intended environment.
- `SESSION_SECRET` is not empty.
- Production never relies on development fallback behavior.

## Build Process

Install dependencies:

```powershell
npm install
```

Generate Prisma Client:

```powershell
npx prisma generate
```

Run tests:

```powershell
npm test
```

Run lint:

```powershell
npm run lint
```

Build:

```powershell
npm run build
```

Expected output:

- Tests pass.
- ESLint completes without errors.
- Next.js production build completes successfully.
- Build output lists application routes.

## Migration Process

Check migration status:

```powershell
npx prisma migrate status
```

Deploy migrations:

```powershell
npx prisma migrate deploy
```

Regenerate Prisma Client:

```powershell
npx prisma generate
```

Expected output:

- Migration status is up to date.
- No failed migrations.
- Prisma Client generated successfully.

## Startup Commands

Development-style startup:

```powershell
npm run dev
```

Production-style startup:

```powershell
npm run start
```

Expected output:

- Application starts without environment errors.
- Local or hosted URL is available.

## Deployment Validation

Validate these URLs:

- `/`
- `/login`
- `/platform`
- `/platform/settings`
- `/platform/database`
- `/platform/health-analytics`
- `/platform/audit-center`
- `/platform/billing-center`
- `/platform/tenant-center`
- `/dashboard`
- `/branch`
- `/staff`

## Post-Deployment Checks

After deployment:

1. Login as System Administrator.
2. Confirm Platform Settings environment information.
3. Confirm database health.
4. Confirm launch readiness page loads.
5. Confirm Audit Center loads.
6. Confirm Tenant Center loads.
7. Login as Business Owner.
8. Login as Branch Manager.
9. Login as Staff.
10. Open a public customer card.
11. Open scanner.

## Health Verification

Confirm:

- Database Connected.
- Prisma Connected.
- Build Status Healthy.
- Correct database displayed.
- Demo Mode status is expected.
- No visible runtime error pages.

## Deployment Sign-Off

Deployment can be accepted when:

- All commands complete successfully.
- All validation pages load.
- Role logins work.
- Scanner opens.
- Health status is clean.
- Backup exists.
