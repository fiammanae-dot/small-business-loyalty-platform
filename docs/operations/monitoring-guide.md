# Monitoring Guide

This guide defines operational monitoring for Loyalty Card UAE.

## Application Health

Monitor:

- App process running.
- `/login` returns successfully.
- `/platform/settings` loads for System Administrator.
- Build version and environment are visible.
- Error logs are captured.

Recommended checks:

- HTTP uptime check.
- Error-rate alert.
- Response-time alert.

## Database Health

Monitor:

- PostgreSQL reachable.
- Prisma connected.
- Migration status.
- Database size.
- Table count.
- Slow queries.
- Connection saturation.

Use:

- Platform -> Database Health
- Platform -> Settings -> Environment Information
- PostgreSQL logs

## Login Failures

Monitor:

- Failed login attempts in last 24 hours.
- Lockout events.
- Repeated failed attempts by IP.
- Repeated failed attempts by email.

Primary surfaces:

- Platform Health & Analytics
- Audit Center
- `failed_login_audit`

## Scanner Failures

Monitor:

- Invalid QR scan attempts.
- Wrong-business scan attempts.
- Disabled scan token attempts.
- Staff scanner usability reports.

Primary surfaces:

- Scan events
- Audit Center
- Business Owner notifications

## Alert Volume

Monitor:

- Open alerts.
- Critical alerts.
- Escalated alerts.
- Repeated abuse events.
- Cooldown violations.
- Alert deduplication occurrence counts.

Primary surfaces:

- Business Owner Dashboard
- Notifications
- Platform Audit Center

## Subscription Failures

Monitor:

- Expired subscriptions.
- Suspended businesses.
- Overdue invoices.
- Trial ending soon.
- Manual payment recording issues.

Primary surfaces:

- Platform Billing Center
- Platform Subscriptions
- Platform Invoices

## Monitoring Dashboard Recommendations

Create an external operations dashboard with:

- App uptime
- Average response time
- Error count
- Database connection status
- Failed logins
- Invalid scans
- Open critical alerts
- Overdue invoices
- Expiring subscriptions
- Backup freshness

## Alert Thresholds

Initial pilot thresholds:

- App unavailable for 2 minutes: urgent.
- Database unavailable: urgent.
- Failed logins above normal baseline: warning.
- Invalid scans spike: warning.
- Critical business alert: warning.
- Backup older than 24 hours: warning.

## Daily Operations Review

Every day during pilot:

1. Check Platform Health & Analytics.
2. Check Audit Center.
3. Check Billing Center.
4. Check open alerts.
5. Confirm latest backup.
6. Review support tickets.
