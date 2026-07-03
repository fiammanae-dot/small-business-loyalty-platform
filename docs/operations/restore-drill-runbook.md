# Restore Drill Runbook

This runbook explains how to practice restoring Loyalty Card UAE safely.

## Goal

Confirm backups are usable before an emergency happens.

## Drill Rules

- Do not restore over development, pilot, or production.
- Use a temporary restore database.
- Do not run seed scripts.
- Do not delete source data.

## Step 1 - Create Temporary Database

```powershell
createdb -U postgres -h DATABASE_HOST -p 5432 loyalty_platform_restore_drill
```

## Step 2 - Restore Backup

Custom backup:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_restore_drill "backups\Loyalty Card UAE_dev_YYYY-MM-DD_HH-MM.backup"
```

SQL backup:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_restore_drill -f "backups\Loyalty Card UAE_dev_YYYY-MM-DD_HH-MM.sql"
```

## Step 3 - Point Temporary DATABASE_URL

Use a temporary shell variable:

```powershell
$env:DATABASE_URL="postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform_restore_drill?schema=public"
```

Do not overwrite `.env` unless intentionally testing environment switching.

## Step 4 - Run Prisma Generate If Needed

```powershell
npx prisma generate
```

## Step 5 - Start App

```powershell
npm run dev
```

## Step 6 - Verify Core Workflows

Verify:

- `/login`
- `/platform`
- `/platform/database`
- `/dashboard`
- `/branch/scanner`
- `/staff/scanner`
- Public customer card
- Audit Center
- Billing Center
- Tenant Center

## Step 7 - Record Results

Record:

- Backup file name.
- Restore start time.
- Restore end time.
- Errors.
- Verification results.
- Missing data if any.

## Step 8 - Delete Temporary Database After Test

Only after verification is complete:

```powershell
dropdb -U postgres -h DATABASE_HOST -p 5432 loyalty_platform_restore_drill
```

Never drop development, pilot, or production databases during a drill.
