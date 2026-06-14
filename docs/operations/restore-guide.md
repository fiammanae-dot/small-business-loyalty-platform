# Restore Guide

This guide explains how to restore LoyaltyBase from backup.

## Full Restore

1. Stop the application.
2. Confirm the backup file.
3. Create a new empty database:

```powershell
createdb -U postgres -h DATABASE_HOST -p 5432 loyalty_platform_restore
```

4. Restore the backup:

```powershell
pg_restore -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_restore backups\loyalty_platform_YYYYMMDD_HHMM.backup
```

5. Point `.env` temporarily to the restored database:

```text
DATABASE_URL=postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform_restore?schema=public
```

6. Generate Prisma Client:

```powershell
npx prisma generate
```

7. Verify migration status:

```powershell
npx prisma migrate status
```

8. Start the app and validate.

## Point-In-Time Recovery

Point-in-time recovery depends on the PostgreSQL hosting provider.

Required capabilities:

- WAL archiving
- Restore target timestamp
- Backup retention window
- Separate restored database instance

Recommended process:

1. Identify incident timestamp.
2. Restore database to a timestamp before the incident.
3. Restore into a new database or instance.
4. Validate data.
5. Switch application only after validation.

## Restore Verification Checklist

Verify:

- System Administrator login.
- Business Owner login.
- Customer count.
- Loyalty programs.
- Customer cards.
- Scan tokens.
- Stamp transactions.
- Reward redemptions.
- Referral records.
- Billing records.
- Audit events.
- Tenant Center.
- Platform health.

## Restore Sign-Off

Restore is successful when:

- App starts.
- Database and Prisma health are connected.
- All roles can log in.
- Core workflows load.
- No unexpected migration drift appears.
- Operations owner approves the restored state.
