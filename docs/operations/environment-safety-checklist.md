# Environment Safety Checklist

Use this checklist before every deployment or environment switch.

## Database

- [ ] Confirm `DATABASE_URL`.
- [ ] Confirm database name.
- [ ] Development uses `loyalty_platform`.
- [ ] Pilot uses `loyalty_platform_pilot`.
- [ ] Production uses approved production database.
- [ ] Confirm no seed command will run.
- [ ] Confirm backup exists.

## Environment

- [ ] Confirm environment label.
- [ ] Confirm domain.
- [ ] Confirm deployment target.
- [ ] Confirm Node.js version is acceptable.
- [ ] Confirm PostgreSQL is reachable.

## Demo Mode

- [ ] Confirm Demo Mode status.
- [ ] Demo Mode enabled only when intended.
- [ ] Demo banner behavior is expected.
- [ ] External communication protections are understood.

## Platform Settings

- [ ] Open `/platform/settings`.
- [ ] Confirm Environment Information.
- [ ] Confirm Platform Health Summary.
- [ ] Confirm Demo Mode panel.
- [ ] Confirm settings page loads without error.

## Migrations

- [ ] Run `npx prisma migrate status`.
- [ ] Confirm pending migrations are expected.
- [ ] Backup database before `migrate deploy`.
- [ ] Run `npx prisma migrate deploy` only after approval.
- [ ] Run `npx prisma generate`.

## Build Version

- [ ] Confirm package version.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Record deployment timestamp.

## Health Dashboard

- [ ] Open `/platform/database`.
- [ ] Open `/platform/health-analytics`.
- [ ] Open `/platform/audit-center`.
- [ ] Open `/platform/billing-center`.
- [ ] Open `/platform/tenant-center`.

## Final Approval

- [ ] Deployment owner approved.
- [ ] Rollback owner available.
- [ ] Backup verified.
- [ ] Pilot or production users informed if needed.
