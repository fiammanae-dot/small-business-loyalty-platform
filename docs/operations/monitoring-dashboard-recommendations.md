# Monitoring Dashboard Recommendations

Loyalty Card UAE should provide role-focused dashboards that separate platform health, operational workload, support visibility, and commercial health.

## System Administrator Dashboard

| Widget | Purpose |
| --- | --- |
| System Health | Shows current state of frontend, backend, database, queue, storage, SSL, and domain checks. |
| Open Alerts | Highlights unresolved Critical and High alerts with owner and age. |
| Revenue Health | Shows payment failures, revenue trend, invoice generation, and provider reconciliation status. |
| Subscription Health | Shows active, trial, past-due, cancelled, and mismatched subscription counts. |
| Security Overview | Shows failed login spikes, suspicious admin access, and permission-denied trends. |
| Backup Status | Shows latest successful backup, restore-test age, and backup failure alerts. |

## Operations Dashboard

| Widget | Purpose |
| --- | --- |
| System Health | Tracks uptime, HTTP 5xx rate, database status, queue status, and worker heartbeat. |
| Open Alerts | Lists alert severity, owner, source, age, and response target. |
| Failed Actions | Aggregates failed background jobs, failed requests, failed scanner actions, and failed billing jobs. |
| Cooldown Violations | Tracks repeated cooldown violations by tenant and time period. |
| Performance | Shows p95 response time, slow queries, queue depth, CPU, memory, and storage. |
| Deployment Health | Shows current release, last deployment status, and post-deployment smoke checks. |

## Support Dashboard

| Widget | Purpose |
| --- | --- |
| Tenant Health | Shows tenant-specific scanner failures, login issues, failed actions, and open incidents. |
| Failed Logins | Helps support identify account access issues and possible security escalation. |
| Scanner Reliability | Shows scanner success rate, browser/device patterns, and tenant-specific failure spikes. |
| Reward and Referral Issues | Shows failed reward redemptions and referral errors requiring support follow-up. |
| Open Alerts | Filters incidents that support may need to communicate to tenants. |

## Recommended Widget Definitions

| Widget | Suggested metrics |
| --- | --- |
| System Health | Uptime, app health check, database health, queue health, storage, SSL days remaining, domain days remaining. |
| Failed Logins | Count by role, tenant, time window, source pattern, and admin account targeting. |
| Open Alerts | Severity, service, owner, age, acknowledgement state, response target. |
| Cooldown Violations | Count by tenant, user, action type, and time window. |
| Failed Actions | Failed requests, failed jobs, scanner failures, reward failures, referral failures, billing failures. |
| Revenue Health | Payment success rate, failed payments, invoice count, revenue trend, reconciliation mismatches. |
| Subscription Health | Active subscriptions, past due subscriptions, cancellations, trials, pending changes, mismatches. |

## Dashboard Implementation Notes

- Dashboards should link to logs, traces, error events, and runbooks.
- Each Critical and High widget should show owner and last update time.
- Tenant-level dashboards should avoid exposing sensitive customer data beyond operational need.
- Dashboards should support filtering by environment, tenant, time range, component, and severity.

