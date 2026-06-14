# Backup and Restore Guide

This guide describes how to back up and restore LoyaltyBase during the pilot.

## Back Up Source Code

Use Git or archive the project folder.

Recommended:

```powershell
git status
git add .
git commit -m "Pilot backup"
```

If Git is unavailable, copy the full project folder to a secure backup location.

## Back Up PostgreSQL Database

Use `pg_dump` from the PostgreSQL bin folder.

Example:

```powershell
pg_dump -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform -F c -f loyalty_platform.backup
```

If prompted, enter the PostgreSQL password.

For this local pilot environment, the expected password is:

```text
postgres
```

## Back Up Environment File

Back up `.env` separately and securely.

Important values include:

- DATABASE_URL
- SESSION_SECRET

Never share `.env` publicly.

## Restore on a New Machine

1. Install Node.js.
2. Install PostgreSQL.
3. Restore the source code folder.
4. Restore `.env`.
5. Create the database if it does not exist:

```powershell
createdb -U postgres -h DATABASE_HOST -p 5432 loyalty_platform
```

6. Restore the database:

```powershell
pg_restore -U postgres -h DATABASE_HOST -p 5432 -d loyalty_platform loyalty_platform.backup
```

7. Install dependencies:

```powershell
npm install
```

8. Generate Prisma Client:

```powershell
npx prisma generate
```

9. Verify migrations:

```powershell
npx prisma migrate status
```

10. Build the app:

```powershell
npm run build
```

## Verify Restored System

After restore:

1. Start the app.
2. Log in as System Administrator.
3. Open Platform -> Settings -> System Health.
4. Confirm Database Connected and Prisma Connected.
5. Open Platform -> Launch Readiness.
6. Open a test Business Owner account.
7. Verify customers, programs, cards, scans, stamps, alerts, messages, and billing records are present.

## Backup Frequency During Pilot

Recommended minimum:

- Daily database backup
- Backup before every migration
- Backup before pilot testing sessions
- Backup after completing pilot setup for each business
