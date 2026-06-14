# Rollback Runbook

This runbook describes how to roll back LoyaltyBase safely.

## When Rollback Is Required

Rollback may be required when:

- The application cannot start.
- Login is broken.
- Database migrations fail.
- Core workflows fail after deployment.
- Cross-role permissions behave incorrectly.
- Scanner workflows become unusable.
- A critical production regression is found.

## Rollback Procedure

1. Announce rollback decision.
2. Stop the failing application process.
3. Preserve application logs.
4. Preserve database logs if available.
5. Restore the last known good application release.
6. Install dependencies if needed:

```powershell
npm install
```

7. Generate Prisma Client:

```powershell
npx prisma generate
```

8. Build restored release:

```powershell
npm run build
```

9. Start restored release:

```powershell
npm run start
```

10. Run validation after rollback.

## Database Considerations

Database rollback is higher risk than application rollback.

Before restoring a database backup:

- Confirm backup timestamp.
- Confirm whether real users created data after the backup.
- Confirm whether immutable records are affected.
- Confirm whether a forward fix is safer.

Do not drop or overwrite a database without explicit approval.

## Validation After Rollback

Validate:

- `/login`
- System Administrator login.
- Business Owner login.
- Branch Manager login.
- Staff login.
- `/platform/settings`
- `/platform/database`
- `/platform/audit-center`
- `/dashboard`
- `/branch/scanner`
- `/staff/scanner`
- Public customer card.

## Emergency Contacts

Fill this section before launch.

- System Administrator:
- Technical Owner:
- Database Owner:
- Hosting Provider Contact:
- Pilot Business Contact:

## Recovery Verification

Rollback is successful when:

- App starts.
- Health pages show connected status.
- Role logins work.
- Scanner route opens.
- No critical errors appear.
- Pilot or production users can resume operation.

## Post-Rollback Review

After rollback:

1. Record incident timeline.
2. Record root cause.
3. Record affected users.
4. Record data impact.
5. Create fix plan.
6. Test fix in development before redeployment.
