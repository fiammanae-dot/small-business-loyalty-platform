# Error Response Runbook

This runbook gives operational responders a provider-neutral response path for launch-critical incidents.

## Standard Incident Steps

1. Acknowledge the alert and assign an incident owner.
2. Record start time, affected environment, affected tenants, and visible symptoms.
3. Check recent deployments, migrations, configuration changes, scheduled jobs, and external service status.
4. Stabilize first, then investigate root cause.
5. Communicate status to internal stakeholders before support messages tenants.
6. Verify recovery with monitoring and controlled workflow checks.
7. Record root cause, impact, timeline, resolution, and prevention work.

## Website Unavailable

1. Confirm from multiple networks or monitoring locations.
2. Check web server, application runtime, recent deployment, DNS, SSL, and upstream proxy status.
3. Review application logs for boot errors or HTTP 5xx spikes.
4. Roll back the latest deployment if the outage started after release.
5. Verify public pages, authenticated dashboard access, and admin access.

## Database Unavailable

1. Confirm whether the issue is connectivity, credentials, storage, resource exhaustion, or database process failure.
2. Check connection limits, disk space, CPU, memory, locks, and database service status.
3. Stop non-essential background jobs if they are exhausting connections.
4. Restore service through approved restart, failover, or hosting-provider recovery process.
5. Verify data integrity and recent backup status before closing.

## Deployment Failure

1. Identify the failed deployment version and the last known good version.
2. Confirm whether traffic is affected.
3. Roll back if production is degraded.
4. Review build logs, runtime logs, environment variables, and dependency installation output.
5. Re-run post-deployment smoke checks after rollback or fix.

## Migration Failure

1. Stop the deployment process and prevent further schema-affecting commands.
2. Identify the migration step, failure message, and database state.
3. Confirm whether the application version expects the migration to be complete.
4. Restore compatibility through rollback or approved database recovery steps.
5. Verify application boot, affected workflows, and backup availability.

## Backup Failure

1. Confirm the failed backup job, backup target, and error message.
2. Verify whether the most recent successful backup still satisfies recovery point objective.
3. Check storage capacity, credentials, network access, and backup service health.
4. Re-run backup manually when safe.
5. Perform a periodic restore test in a non-production environment.

## Restore Failure

1. Stop any destructive recovery attempt until the failure mode is understood.
2. Confirm backup file integrity, restore command, target environment, credentials, and storage capacity.
3. Try restore in an isolated environment first when possible.
4. Escalate to the database or hosting owner if backup corruption is suspected.
5. Document actual recoverability and update backup procedures.

## Authentication Issue

1. Determine whether all users, one role, one tenant, or specific accounts are affected.
2. Check session storage, database access, password reset mail delivery, and recent auth-related deployments.
3. Review failed login spikes and suspicious admin access.
4. If security risk exists, escalate to security owner before broad remediation.
5. Verify login, logout, password reset, and admin access after recovery.

## Scanner Issue

1. Identify affected tenant, device/browser, scan type, and error message.
2. Confirm whether scanner UI loads, camera permissions work, and backend validation responds.
3. Review scanner failure rate, response latency, invalid payloads, and recent deployment changes.
4. Provide support with tenant-specific workaround guidance if available.
5. Verify scanner flow with a controlled test that does not alter production data unexpectedly.

## Referral Issue

1. Identify affected tenant, referral action, validation reason, and error rate.
2. Check recent deployments, referral configuration, database errors, and audit event generation.
3. Determine whether the issue is isolated, abuse-related, or platform-wide.
4. Escalate suspected abuse to operations and security review.
5. Verify referral flow and audit records after recovery.

## Billing Issue

1. Determine whether payment processing, invoice generation, subscription status, or reconciliation is affected.
2. Compare platform billing records with provider records if a provider is integrated.
3. Check scheduled jobs, webhooks, provider status, database errors, and recent deployments.
4. Escalate revenue-impacting or access-impacting issues to finance owner and system administrator.
5. Verify subscription health, invoice status, and affected tenant records before closing.

