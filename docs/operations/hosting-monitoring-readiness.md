# Hosting Monitoring Readiness

This document prepares Loyalty Card UAE for future production hosting without assuming a specific hosting provider.

## Server Monitoring

- Monitor server availability, process health, CPU, memory, disk usage, load, and restart count.
- Alert when CPU or memory exceeds 85% for sustained periods.
- Alert when disk usage exceeds 85%; treat 95% as Critical.
- Track deployment version, runtime version, and service restart history.

## Database Monitoring

- Monitor database availability, connection usage, query latency, lock waits, storage, and backup completion.
- Alert at 85% connection usage or storage capacity.
- Track slow queries above 1 second for review and repeated queries above 5 seconds for alerting.
- Maintain backup age, backup size, and restore-test status.

## Storage Monitoring

- Monitor local disk, database storage, uploaded file storage, log storage, and backup storage.
- Alert before storage reaches operational limits.
- Track storage growth rate to forecast expansion needs.
- Ensure logs and backups have retention policies that do not exhaust production storage.

## SSL Monitoring

- Monitor certificate validity, expiry date, hostname match, and renewal status.
- Warn at 30 days remaining, alert at 14 days, and treat 7 days as Critical.
- Verify certificate renewal after DNS or hosting changes.

## Domain Monitoring

- Monitor domain expiry, DNS resolution, DNS record drift, and nameserver changes.
- Warn at 60 days before expiry and alert at 30 days.
- Keep registrar access and recovery contacts documented outside the application.

## Resource Monitoring

- Monitor CPU, memory, disk I/O, network throughput, queue worker count, application process count, and web server saturation.
- Establish launch baselines during staging and first production usage.
- Review resource trends weekly during early commercial launch.
- Scale resources before sustained usage exceeds 70% of available capacity.

## Backup Monitoring

- Monitor backup job success, backup age, backup size, backup destination, retention, and restore test status.
- Alert on any failed scheduled production backup.
- Treat absence of a valid backup within recovery point objective as Critical.
- Run restore tests on a regular schedule in a non-production environment.

## Provider-Neutral Requirements

- Monitoring must work across managed hosting, VPS, container, or platform-as-a-service environments.
- Alerts must be exportable to email, chat, incident tooling, or SMS/paging.
- Metrics should use standard names and tags for environment, tenant where safe, component, severity, and release.
- Operational secrets must never be embedded in dashboards, alerts, logs, or health endpoints.

