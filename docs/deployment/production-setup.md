# LoyaltyBase Production Setup

This guide prepares LoyaltyBase for the first production deployment using a clean production database. It does not require deleting or changing the current development database.

## Environment Strategy

Development remains unchanged:

- Database: existing `loyalty_platform`
- Purpose: feature development, QA, and internal test data
- Demo/test records may remain for development workflows

Production uses a fresh database:

- Database: new empty production database
- Purpose: real customers and commercial operation
- Setup method: migrations only, no demo seed data
- First account: one System Administrator

## Environment Variables

Create the production environment from `.env.example.production` and provide real values.

Required variables:

```env
APP_ENV=production
NODE_ENV=production
APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
BASE_URL=https://your-domain.com
DATABASE_URL=
SESSION_SECRET=
ADMIN_EMAIL=admin@yourdomain.com
DEV_AUTH_FALLBACK=false
DEMO_MODE=false
```

Production requirements:

- `APP_ENV` must be `production`.
- `NODE_ENV` must be `production`.
- `DATABASE_URL` must point to the production database only.
- `SESSION_SECRET` must be a long random secret and must not be reused from development or pilot.
- `DEV_AUTH_FALLBACK` must be `false`.
- Public URLs must use the production domain, not local development hosts.

## Production Database Setup

Create a new empty PostgreSQL database for production. Do not restore development or pilot data into this database.

Recommended approach:

1. Create the production database through the hosting provider or PostgreSQL administration tool.
2. Configure `DATABASE_URL` to point to the production database.
3. Run migrations only:

```powershell
npx prisma migrate deploy
```

4. Generate Prisma Client:

```powershell
npx prisma generate
```

Do not run demo or pilot seed scripts in production.

## First System Administrator

Create exactly one initial System Administrator account:

- Email: `admin@yourdomain.com`
- Password: temporary password generated outside the repository
- Required action: change password immediately after first login

Recommended process:

1. Generate a strong temporary password using a secure password manager.
2. Create the administrator through a controlled one-time production setup script or manual database administration procedure approved for launch.
3. Log in once as the administrator.
4. Change the password immediately if password-change support is available.
5. Store the final credential in the approved secure credential vault.

Do not commit administrator passwords or password hashes.

## Deployment Steps

Pre-deployment:

1. Confirm the deployment target is production.
2. Confirm `DATABASE_URL` points to the production database.
3. Confirm development and pilot databases are not targeted.
4. Confirm backups are available.
5. Confirm `.env.example.production` has been copied and completed in the deployment environment.

Build and deploy:

```powershell
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start
```

Validation:

```powershell
node scripts/check-production-readiness.js
```

Post-deployment checks:

- Production homepage loads.
- `/login` loads.
- System Administrator can log in.
- Platform dashboard loads.
- Platform settings show the production environment and production database.
- No demo credentials appear on the login page.
- No demo businesses exist in the production database.

## Backup Procedure

Before deployment:

1. Create a production database backup.
2. Store backup outside the application server.
3. Verify backup file size and timestamp.
4. Confirm restore procedure is documented and accessible.

Recommended command pattern:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -Fc -d "<production-database-url>" -f "backups\loyaltybase_production_YYYY-MM-DD_HH-MM.backup"
```

Use provider-native automated backups when available.

## Rollback Procedure

Application rollback:

1. Stop the current application process.
2. Redeploy the previous known-good application build.
3. Restart the application.
4. Run health checks.

Database rollback considerations:

- Database rollbacks require explicit approval.
- Prefer forward-fix migrations when possible.
- Never restore over production without a fresh backup and written approval.
- If restore is required, restore into a temporary database first and verify the backup.

Emergency validation after rollback:

- Login works.
- Platform dashboard loads.
- Production database connection is healthy.
- Customer card pages load.
- Scanner routes load.
- Audit Center loads.

## Deployment Readiness Check

Run:

```powershell
node scripts/check-production-readiness.js
```

The script verifies:

- `APP_ENV=production`
- Required environment variables exist
- Development auth fallback is disabled
- Public URLs do not point to development hosts
- Database connection is valid
- Storage path is writable

The script is safe to run. It does not migrate, seed, delete, or modify business data.

## Remaining Production Gate

Before real customer launch, confirm:

- Production database is empty except the first System Administrator.
- Backups are enabled.
- Monitoring is enabled.
- SSL is active.
- Deployment rollback has been rehearsed.
- Real-device scanner QA has been completed.

