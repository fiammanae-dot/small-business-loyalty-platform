# Backup Guide

This guide defines the backup process for LoyaltyBase pilot and production operations.

## Backup Scope

Back up:

- PostgreSQL database
- `.env` file
- Source code or release artifact
- Uploaded assets if external file storage is added later
- Deployment notes and runbooks

## PostgreSQL Backup Command

Custom-format backup:

```powershell
pg_dump -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform -F c -f backups\loyalty_platform_YYYYMMDD_HHMM.backup
```

Plain SQL backup:

```powershell
pg_dump -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform -f backups\loyalty_platform_YYYYMMDD_HHMM.sql
```

For pilot:

```powershell
pg_dump -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform_pilot -F c -f backups\loyalty_platform_pilot_YYYYMMDD_HHMM.backup
```

## Backup Schedule

Recommended pilot schedule:

- Daily database backup.
- Backup before every migration.
- Backup before onboarding a new pilot business.
- Backup after major pilot validation sessions.

Recommended production schedule:

- Daily full database backup.
- Point-in-time recovery if managed PostgreSQL supports WAL archiving.
- Pre-deployment backup before every release.

## Retention Policy

Pilot:

- Keep daily backups for 14 days.
- Keep weekly backups for 8 weeks.
- Keep one final clean pilot launch backup.

Production:

- Keep daily backups for 30 days.
- Keep weekly backups for 12 weeks.
- Keep monthly backups for 12 months.

## Backup Verification Checklist

After creating a backup:

- Confirm backup file exists.
- Confirm file size is not zero.
- Record backup timestamp.
- Record database name.
- Store backup in secure location.
- Test restore on a non-production database at least weekly during pilot.

## Security

- Treat backups as sensitive.
- Do not email database backups.
- Do not store backups in public folders.
- Protect `.env` separately.
- Limit access to System Administrator or operations owner only.
