# System Health Inventory

This inventory defines the critical LoyaltyBase components that should be represented in monitoring, alerts, dashboards, and runbooks.

| Component | Purpose | Dependencies | Failure impact | Monitoring recommendation |
| --- | --- | --- | --- | --- |
| Frontend | Provides merchant, staff, and administrator interface access. | Web server, backend routes, static assets, authentication. | Users cannot access workflows even if backend is healthy. | Monitor uptime, page load time, asset failures, JavaScript errors, and deployment health. |
| Backend | Handles application requests, business workflows, admin actions, and integrations. | Runtime, database, cache/session store, queue, mail/notification services. | Core platform actions fail or produce errors. | Monitor 5xx rate, request latency, logs, queue failures, dependency errors, and deployment status. |
| Database | Stores tenants, users, loyalty data, rewards, referrals, billing records, audits, and configuration. | Database server, storage, backups, network access. | Most platform operations fail; data integrity risk increases. | Monitor availability, connections, slow queries, locks, storage, replication if used, and backup completion. |
| Authentication | Controls user access and session validity. | Backend, database, session/cookie configuration, mail for resets. | Users cannot log in or access may become unreliable. | Monitor login failures, lockouts, password resets, session errors, admin login activity, and suspicious patterns. |
| Scanner System | Supports scan-based operational actions. | Frontend scanner UI, camera/browser permissions, backend validation, database, loyalty/reward rules. | Merchant point-of-service workflows slow down or fail. | Monitor scan attempts, scan failures, response latency, repeated invalid codes, tenant-specific spikes, and browser-side scanner errors. |
| Loyalty Engine | Applies earning, redemption, cooldown, and balance-related behavior. | Backend, database, tenant configuration, audit logging. | Customer balances or loyalty actions may fail, causing support incidents. | Monitor failed loyalty actions, cooldown violations, abnormal action volume, and audit event generation. |
| Reward Engine | Manages reward eligibility and redemption operations. | Backend, database, loyalty data, scanner where applicable, audit logging. | Customers may be unable to redeem rewards or incorrect failures may occur. | Monitor redemption failures, eligibility check errors, repeated tenant-specific failures, and reward audit records. |
| Referral Engine | Manages referral events and related validations. | Backend, database, tenant settings, notification/audit systems. | Referral acquisition tracking may fail or abuse may go undetected. | Monitor referral creation failures, repeated duplicate/invalid attempts, abnormal spikes, and audit events. |
| Billing Center | Tracks subscriptions, invoices, payment status, and billing operational views. | Backend, database, payment provider if integrated, scheduled jobs, notifications. | Revenue leakage, incorrect subscription visibility, or account-status confusion. | Monitor payment failures, subscription mismatches, invoice generation, provider webhook failures, and reconciliation status. |
| Audit Center | Provides traceability for sensitive and operational events. | Backend event capture, database, storage retention policy. | Investigations become unreliable; compliance and accountability risk increases. | Monitor audit write failures, missing expected event types, retention health, and high-risk activity volume. |
| Tenant Center | Manages tenant records, configuration, and operational status. | Backend, database, authentication, permissions. | Tenant setup or administration may fail; multi-tenant operations may be affected. | Monitor tenant creation/update failures, status mismatches, configuration errors, and admin audit events. |
| Message Queue | Runs background jobs such as notifications, reconciliation, maintenance, or scheduled work. | Queue driver, workers, backend code, database, external services. | Time-sensitive or asynchronous work may stop silently. | Monitor queue depth, failed jobs, worker heartbeat, retry counts, and oldest pending job age. |

## Health Check Recommendations

- Expose a lightweight application health endpoint that verifies the app can boot.
- Expose a deeper internal health check for database, cache/session, queue, and storage dependencies.
- Keep deep health checks protected from public access.
- Include build version, deployment timestamp, and environment name in internal diagnostics.
- Never include secrets, customer data, tokens, or personally identifiable information in health responses.

