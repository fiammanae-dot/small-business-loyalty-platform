# PostgreSQL Backup Guide

This guide provides Windows commands for backing up LoyaltyBase PostgreSQL databases.

## PostgreSQL Tool Path

Expected PostgreSQL 18 path:

```powershell
C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
```

If PostgreSQL is installed elsewhere, adjust the path.

## Backup Naming Convention

Use:

```text
loyaltybase_ENV_YYYY-MM-DD_HH-MM.backup
```

Example:

```text
loyaltybase_dev_2026-06-13_18-30.backup
```

Recommended environment names:

- `dev`
- `pilot`
- `prod`

## Create Backup Folder

```powershell
New-Item -ItemType Directory -Force -Path backups
```

## Backup Development Database - Custom Format

Database:

```text
loyalty_platform
```

Command:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform -Fc -f "backups\loyaltybase_dev_YYYY-MM-DD_HH-MM.backup"
```

## Backup Pilot Database - Custom Format

Database:

```text
loyalty_platform_pilot
```

Command:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_pilot -Fc -f "backups\loyaltybase_pilot_YYYY-MM-DD_HH-MM.backup"
```

## Plain SQL Backup

Development:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform -f "backups\loyaltybase_dev_YYYY-MM-DD_HH-MM.sql"
```

Pilot:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_pilot -f "backups\loyaltybase_pilot_YYYY-MM-DD_HH-MM.sql"
```

## Backup Verification

After backup:

```powershell
Get-Item "backups\loyaltybase_dev_YYYY-MM-DD_HH-MM.backup"
```

Confirm:

- File exists.
- File size is greater than zero.
- Timestamp is correct.
- Database name is correct.

## Password Handling

If prompted, enter the PostgreSQL password.

For local development, the expected password may be:

```text
postgres
```

For pilot or production, use the approved secure password.
