# Operations Documentation Index

This folder contains the operational readiness package for Loyalty Card UAE deployment, pilot onboarding, recovery, monitoring, and launch validation.

## Phase 13A Deployment And Environment Management

- `environment-inventory.md`: development, pilot, and production environment definitions.
- `deployment-runbook.md`: pre-deployment checklist, required variables, build, migrations, validation, and expected outputs.
- `rollback-runbook.md`: rollback criteria, procedure, database considerations, validation, and emergency contacts placeholder.
- `application-startup.md`: dependency install, build, startup, database verification, scanner route checks, and dashboard checks.
- `environment-safety-checklist.md`: deployment safety checklist for database, environment, demo mode, migrations, build version, and health pages.
- `platform-architecture.md`: text-only overview of frontend, backend, database, auth, loyalty, referral, billing, audit, tenant, scanner, and monitoring foundations.

## Existing Operational Guides

- `backup-strategy.md`: backup scope, frequency, retention, storage locations, and ownership.
- `postgresql-backup-guide.md`: Windows PostgreSQL backup commands for development and pilot databases.
- `postgresql-restore-guide.md`: safe restore procedures for custom and SQL backups.
- `backup-verification-checklist.md`: file, restore, app, and security verification checklist.
- `restore-drill-runbook.md`: safe restore practice process using a temporary database.
- `recovery-priority-matrix.md`: P1-P4 incident response goals, approval, and verification.

## Phase 13C Monitoring And Error Tracking

- `monitoring-strategy.md`: monitoring goals, scope, and operating model.
- `system-health-inventory.md`: health surfaces and system components to monitor.
- `error-tracking-plan.md`: error capture, triage, ownership, and future tooling plan.
- `operational-alert-matrix.md`: alert severity matrix and response expectations.
- `error-response-runbook.md`: incident response flow for runtime and operational errors.
- `monitoring-dashboard-recommendations.md`: recommended dashboards and metrics.
- `hosting-monitoring-readiness.md`: hosting-level monitoring readiness checklist.
- `platform-health-review.md`: platform health review cadence and checklist.
- `monitoring-gap-analysis.md`: remaining gaps before production-grade monitoring.

## Legacy Operational Guides

- `deployment-guide.md`: environment setup, migrations, build, startup, and validation.
- `rollback-guide.md`: application rollback, database rollback considerations, and emergency recovery.
- `backup-guide.md`: PostgreSQL backup commands, schedule, retention, and verification.
- `restore-guide.md`: full restore, point-in-time recovery guidance, and restore checklist.
- `monitoring-guide.md`: app, database, login, scanner, alert, and billing monitoring.
- `e2e-test-plan.md`: browser-based test plan for System Administrator, Business Owner, Branch Manager, Staff, and Customer journeys.
- `device-qa-checklists.md`: Android, iPhone, scanner, and mobile UI QA checklists.
- `pilot-operations-package.md`: pilot onboarding, support, escalation, and success criteria.
- `go-live-checklist.md`: final launch checklist covering database, backups, security, scanner, referrals, rewards, billing, audit, and tenant management.

## Operating Rule

Run Phase 13 checks against the development database `loyalty_platform` unless an explicit pilot or production operation has been approved.

Do not modify `loyalty_platform_pilot` unless pilot validation work is explicitly requested.

## Recommended Administrator Flow

1. Read `environment-inventory.md`.
2. Complete `environment-safety-checklist.md`.
3. Follow `deployment-runbook.md`.
4. Use `application-startup.md` for local or server startup.
5. Keep `rollback-runbook.md` ready before deployment.
6. Use `go-live-checklist.md` for final launch approval.
