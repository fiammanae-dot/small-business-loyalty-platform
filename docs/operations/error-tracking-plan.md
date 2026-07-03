# Error Tracking Plan

This plan defines how Loyalty Card UAE should classify, investigate, and recover from operational errors before commercial launch.

## Error Categories

| Category | Examples | Tracking recommendation |
| --- | --- | --- |
| Application Errors | Unhandled exceptions, HTTP 500 responses, failed background jobs, broken deployments. | Capture exception type, route/job, tenant identifier where safe, release version, request ID, and stack trace. |
| Database Errors | Connection failures, deadlocks, migration failures, slow queries, storage exhaustion. | Capture database error code, affected query class, connection pool state, deployment context, and backup status. |
| Authentication Errors | Failed logins, reset failures, session errors, suspicious admin access. | Track failure reason, account role, source IP or region where lawful, user agent, and rate patterns. |
| Scanner Errors | Camera/browser scanner failure, invalid scan payloads, backend validation failure, scan latency. | Track scanner route, tenant, browser/device metadata where safe, failure reason, and response time. |
| Referral Errors | Duplicate referral attempts, invalid referral state, referral creation failure, suspicious spikes. | Track referral action, tenant, validation reason, and related audit event. |
| Reward Errors | Reward eligibility failure, redemption failure, repeated tenant-specific reward errors. | Track reward ID, tenant, validation reason, loyalty state summary, and audit event. |
| Billing Errors | Payment failure, invoice failure, subscription mismatch, webhook processing failure. | Track tenant, provider event ID if used, billing state, retry state, and reconciliation status. |
| Audit Errors | Audit write failure, missing expected event, log retention issue. | Track event type, actor, tenant, request ID, write error, and fallback log reference. |

## Severity Levels

| Severity | Definition | Response expectation |
| --- | --- | --- |
| Critical | Platform unavailable, database unavailable, billing integrity risk, security incident, data loss risk. | Acknowledge within 15 minutes; begin incident response immediately; escalate to system administrator. |
| High | Major workflow degraded, repeated scanner failures, authentication issues, failed backups, repeated job failures. | Acknowledge within 30 minutes; investigate same day; escalate if customer or revenue impact grows. |
| Medium | Partial workflow issue, abnormal trends, tenant-specific repeated errors, non-critical performance degradation. | Review within 1 business day; create follow-up task if confirmed. |
| Low | Single recoverable error, noisy alert, documentation gap, minor operational warning. | Review during normal operations cycle. |

## Response Expectations

- Every Critical and High error must have an owner, timeline, user impact assessment, and resolution note.
- Repeated Medium errors should be promoted to High when they affect multiple tenants or a launch-critical workflow.
- Billing, authentication, backup, and audit failures require explicit confirmation that data and access integrity remain intact.
- Support should receive clear incident notes before communicating with affected tenants.

## Investigation Process

1. Confirm the alert source and current impact.
2. Identify affected tenants, users, workflows, routes, jobs, or external services.
3. Check recent deployments, configuration changes, migrations, and scheduled jobs.
4. Review application logs, error tracker events, database health, and queue status.
5. Reproduce only in a safe environment when reproduction could alter tenant data.
6. Document root cause, timeline, mitigation, and prevention action.

## Recovery Process

1. Stabilize the service by rollback, restart, failover, disabling a non-critical job, or applying an approved operational fix.
2. Verify application, database, queue, billing, authentication, scanner, and audit health as relevant.
3. Confirm affected workflows with a controlled smoke test.
4. Review data integrity where the failure involved billing, loyalty, rewards, referrals, scanner actions, or audit records.
5. Close the incident only after monitoring shows normal behavior.
6. Add a follow-up task for missing alert coverage, runbook updates, or code-level remediation.

