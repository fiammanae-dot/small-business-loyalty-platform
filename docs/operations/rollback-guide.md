# Rollback Guide

This guide describes how to recover from a failed LoyaltyBase deployment.

## Rollback Principles

- Stop the failing deployment first.
- Preserve logs before replacing files.
- Do not run destructive database commands without a verified backup.
- Application rollback is usually safer than database rollback.

## Application Rollback Procedure

1. Identify the last known good release.
2. Stop the current app process.
3. Restore the previous application build or commit.
4. Run dependency install if package files changed:

```powershell
npm install
```

5. Regenerate Prisma Client:

```powershell
npx prisma generate
```

6. Build the restored version:

```powershell
npm run build
```

7. Start the restored app:

```powershell
npm run start
```

8. Validate `/login`, `/platform`, `/dashboard`, scanner, and public cards.

## Database Rollback Considerations

Prisma migrations are forward-only by design. Before rolling back database state:

- Confirm a backup exists from before the failed migration.
- Confirm no pilot or production users created important data after the backup.
- Prefer a forward fix when data was already used by real users.

Database rollback should be treated as emergency recovery, not routine deployment flow.

## Emergency Database Restore

1. Stop the application.
2. Create an emergency backup of the current failed state.
3. Restore the last verified backup to a new temporary database.
4. Verify the temporary database.
5. Point `DATABASE_URL` to the restored database.
6. Start the app and validate.

## Emergency Recovery Process

Use this order:

1. Declare incident.
2. Stop deployment.
3. Preserve logs.
4. Restore app release.
5. Assess database compatibility.
6. Restore database only if required.
7. Validate core workflows.
8. Document root cause.
9. Create follow-up tasks.

## Rollback Validation Checklist

- System Administrator login works.
- Business Owner login works.
- Customer cards open.
- Scanner opens.
- Stamp issuance test works in QA data.
- Reward redemption state is intact.
- Billing pages load.
- Audit Center loads.
- No unexpected data loss is observed.
