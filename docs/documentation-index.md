# Loyalty Card UAE Documentation Index

Version: 1.0

## Executive Summary

This documentation package maps the current Loyalty Card UAE architecture, routes, database, roles, features, APIs/actions, reusable components, design system, QA scenarios, and launch readiness. It is intended for product ownership, redesign planning, future developers, external AI tools, QA, pilot launch preparation, and future scaling.

## Generated Documents

| Document | Purpose |
|---|---|
| [UI/UX File Map](./ui-ux-file-map.md) | Complete editing map for pages and UI redesign |
| [Database Map](./database-map.md) | Prisma/database architecture and table relationships |
| [Role Matrix](./role-matrix.md) | Permissions by role |
| [Page Inventory](./page-inventory.md) | Route inventory grouped by area |
| [Feature Inventory](./feature-inventory.md) | Implemented/partial/future feature map |
| [API Map](./api-map.md) | API routes and server actions |
| [Component Reuse Map](./component-reuse-map.md) | Shared/high-impact components |
| [Launch Readiness Checklist](./launch-readiness-checklist.md) | Operational launch assessment |
| [Design System](./design-system.md) | Current UI standards and improvement opportunities |
| [QA Test Scenarios](./qa-test-scenarios.md) | Manual QA scenario library |

## Platform Overview

Loyalty Card UAE is a multi-tenant loyalty SaaS platform for small businesses. It supports customer enrollment, digital loyalty cards, QR scanning, stamp issuance, rewards, referrals, customer tiers, engagement/message preparation, business billing, platform administration, audit trails, alert governance, and operational readiness workflows.

## Architecture Summary

- Framework: Next.js App Router.
- Database: PostgreSQL via Prisma.
- Authentication: signed session cookie, role-based route helpers, CSRF-protected mutations.
- Multi-tenancy: business and branch scoping through Prisma filters and route helpers.
- Loyalty engine: customer program memberships, stamp transactions, reward redemptions.
- Referral engine: referral code, pending/qualified lifecycle, first-stamp qualification.
- Scanner system: camera scanner and manual token fallback, existing `/scan/[token]` validation.
- Billing: three plans, subscriptions, invoices, payments, billing center.
- Audit: unified audit events, alert events, immutable transactions.

## Current Launch Readiness Assessment

- Development completion: 90%
- Pilot readiness: 82%
- Commercial readiness: 70%
- Production readiness: 72%

## Top Risks

1. Real-device scanner testing is still essential.
2. Production database/environment must be verified before pilot.
3. Monitoring needs live hosting integration.
4. PDF/Excel exports are UI-ready in places but may need provider/generation confirmation.
5. Billing operational process needs real payment workflow validation.
6. Alert thresholds require pilot tuning.
7. Customer 360 and dashboards should continue usability testing with real businesses.

## Recommended Next Steps

1. Run production environment verification.
2. Run real-device scanner QA on iPhone and Android.
3. Execute the QA scenarios in this package for the first pilot business.
4. Verify clean production/pilot database and backups.
5. Validate first business onboarding end to end.
6. Tune abuse/alert policies during pilot.
7. Confirm CSV exports and operational support process.

