# Backup Strategy

This document defines the LoyaltyBase backup strategy for development, pilot, and production operations.

## What Must Be Backed Up

Back up:

- Source code
- PostgreSQL database
- `.env` and environment variables
- Uploaded files or storage folders if added later
- Operational documentation
- Deployment notes
- Backup and restore scripts

## Source Code Backup

Recommended:

- Use Git as the primary source code backup.
- Push to a private remote repository.
- Tag stable releases before deployment.
- Keep a local archive before risky changes.

Minimum local archive:

```powershell
Compress-Archive -Path . -DestinationPath backups\loyaltybase_source_YYYY-MM-DD_HH-MM.zip
```

Do not include `node_modules` or `.next` in long-term source archives unless required for troubleshooting.

## PostgreSQL Database Backup

Use PostgreSQL native tools:

- `pg_dump -Fc` for custom-format backups.
- `pg_dump` plain SQL for readable SQL backups.

Create a database backup:

- Before every deployment.
- Before every migration.
- Before pilot onboarding.
- Daily during active use.

## Environment Variables Backup

Back up:

- `.env`
- `.env.pilot`
- Production secrets from the hosting provider

Security rules:

- Store environment files encrypted or in a secure password manager.
- Never commit `.env`.
- Never email `.env`.
- Limit access to the operations owner.

## Upload And Storage Backup

Current application state primarily stores URLs and database records.

If file upload storage is added later, back up:

- Uploaded logos
- Uploaded customer assets
- Generated media
- Provider-specific storage buckets

Storage backup should follow the same retention policy as the database.

## Backup Frequency

Development:

- Daily backup during active work.
- Keep 7 days.
- Back up before major schema work.

Pilot:

- Daily backup.
- Weekly backup.
- Monthly archive.
- Back up before onboarding each pilot business.

Production:

- Daily automated backup.
- Weekly full backup.
- Monthly archive.
- Back up before every deployment.
- Use point-in-time recovery if supported by hosting.

## Retention Policy

Development:

- Keep 7 daily backups.

Pilot:

- Keep 14 daily backups.
- Keep 8 weekly backups.
- Keep monthly archives for pilot duration.

Production:

- Keep 30 daily backups.
- Keep 12 weekly backups.
- Keep 12 monthly archives.
- Keep pre-deployment backups for at least 90 days.

## Backup Storage Locations

Use multiple locations:

- Local backup folder for fast recovery.
- External drive for machine failure recovery.
- Cloud backup for site/device failure recovery.

Recommended:

- Local: `backups/`
- External drive: encrypted folder
- Cloud: private encrypted storage or managed backup service

## Backup Quality Rules

A backup is not trusted until:

- File exists.
- File size is reasonable.
- Restore has been tested.
- App connects to restored database.
- Login and core pages work.

## Ownership

Assign:

- Backup owner
- Restore owner
- Deployment owner
- Emergency approver
