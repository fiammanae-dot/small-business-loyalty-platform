# PostgreSQL Restore Guide

This guide explains safe PostgreSQL restore procedures for Loyalty Card UAE.

## Warnings

- Do not restore over production without approval.
- Always back up the current database before restore.
- Confirm `DATABASE_URL` before restore.
- Prefer restoring into a new empty database first.
- Never assume a backup is valid until restore is tested.

## Restore Into A New Empty Database

Create a temporary database:

```powershell
createdb -U postgres -h DATABASE_HOST -p 5432 loyalty_platform_restore
```

## Restore Custom Backup With pg_restore

Use a `.backup` file created with `pg_dump -Fc`.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_restore "backups\Loyalty Card UAE_dev_YYYY-MM-DD_HH-MM.backup"
```

## Restore SQL Backup With psql

Use a `.sql` file created with plain `pg_dump`.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_restore -f "backups\Loyalty Card UAE_dev_YYYY-MM-DD_HH-MM.sql"
```

## Point Application To Restored Database

For restore testing only, set:

```text
DATABASE_URL=postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform_restore?schema=public
```

Do not overwrite production `.env` without approval.

## Verify Restore Worked

Run:

```powershell
npx prisma generate
npx prisma migrate status
npm run build
```

Then start the app and verify:

- System Administrator login.
- Business Owner login.
- Customer list.
- Customer card.
- Scanner route.
- Reward redemption page.
- Audit Center.
- Billing Center.
- Tenant Center.

## Restore Sign-Off

Restore is accepted when:

- Database health is connected.
- Prisma health is connected.
- Required users can log in.
- Core workflows load.
- Audit records exist.
- No migration drift is reported.
