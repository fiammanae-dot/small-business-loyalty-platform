# Go-Live Checklist

Use this checklist before pilot or production launch.

## Database

- Target database confirmed.
- Migrations deployed.
- Prisma Client generated.
- Migration status up to date.
- Database Health page connected.

## Backups

- Pre-launch backup created.
- Backup file verified.
- Restore process tested on non-production database.
- `.env` backed up securely.
- Retention policy confirmed.

## Monitoring

- App health check configured.
- Database health check configured.
- Failed login monitoring reviewed.
- Scanner failure monitoring reviewed.
- Alert volume monitoring reviewed.
- Billing/subscription monitoring reviewed.

## Environment

- Environment Information shows correct environment.
- Database name is correct.
- Demo Mode setting is intentional.
- App version is visible.
- SESSION_SECRET configured.

## Security

- System Administrator account verified.
- Role permissions smoke-tested.
- CSRF protections active.
- Rate limiting active.
- Audit Center accessible to System Administrator only.
- Tenant isolation tests pass.

## Users

- System Administrator login works.
- Business Owner login works.
- Branch Manager login works.
- Staff login works.
- Inactive users cannot operate.

## Scanner

- Staff scanner opens.
- Branch scanner opens.
- Valid QR works.
- Invalid QR shows clean error.
- Wrong-business QR is blocked.
- Disabled token is blocked.

## Referrals

- Referral link appears.
- Self-referral is blocked.
- Referral remains pending until first stamp.
- Referral reward grant is audited.

## Rewards

- Reward Ready state appears.
- Business Owner or Branch Manager can redeem.
- Staff cannot redeem.
- Redemption record is immutable.
- Earned stamps reset correctly after redemption.

## Billing

- Plans exist.
- Subscriptions visible.
- Invoice creation works.
- Payment recording works.
- Business Owner billing view is read-only.

## Audit Center

- Audit Center loads.
- Filters work.
- Event details display.
- Security monitoring panel loads.
- Exports are available.

## Tenant Center

- Tenant Center loads.
- Tenant directory loads.
- Tenant health scores display.
- Branding management links work.
- Domain readiness panel displays.

## Final Go-Live Sign-Off

Launch is approved only when:

- `npm test` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Database backup is verified.
- Role smoke tests pass.
- Mobile scanner QA passes.
- Pilot support owner is assigned.
