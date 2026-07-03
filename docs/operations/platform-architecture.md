# Platform Architecture

This document describes Loyalty Card UAE at a high level using text only.

## Frontend

Loyalty Card UAE uses Next.js with TypeScript and Tailwind CSS.

Primary user surfaces:

- Public landing page
- Login page
- System Administrator dashboard
- Business Owner dashboard
- Branch Manager dashboard
- Staff dashboard
- Public customer card
- Public referral landing page
- Scan validation route

The UI uses a white and orange SaaS design system with role-specific navigation.

## Backend

The backend is implemented through Next.js server components and server actions.

Server-side responsibilities:

- Authentication checks
- Role enforcement
- Tenant filtering
- Form validation
- Prisma database access
- CSRF validation
- Idempotency protections
- Audit logging

## Database

The database is PostgreSQL accessed through Prisma ORM.

Core data areas:

- Users
- Businesses
- Branches
- Business branding
- Subscription plans
- Business subscriptions
- Customers
- Customer memberships
- Loyalty programs
- Program memberships
- Stamp transactions
- Reward redemptions
- Referrals
- Engagement events
- Message delivery queue
- Audit events
- Cooldown rules and events
- Activity alerts
- Invoices and payments

## Authentication

Authentication uses secure password hashing, session cookies, server-side role checks, CSRF protection, and session invalidation.

Role homes:

- System Administrator: `/platform`
- Business Owner: `/dashboard`
- Branch Manager: `/branch`
- Staff: `/staff`

## Loyalty Engine

The loyalty engine manages:

- Loyalty programs
- Program templates
- Customer program enrollment
- Earned stamps
- Bonus stamps
- Dynamic progress calculation

Progress is calculated from:

```text
earned_stamps + bonus_stamps
```

## Referral Engine

The referral engine manages:

- Referral links
- Pending referrals
- Qualification after first stamp
- Referral reward grants
- Referral event audit records

Self-referrals are blocked.

## Billing Center

Commercial operations include:

- Subscription plans
- Subscription lifecycle
- Manual invoices
- Manual payment tracking
- Billing Center dashboard
- Business billing profile

No payment gateway is integrated yet.

## Audit Center

Audit Center provides System Administrator visibility into:

- Audit events
- Security events
- Administrative changes
- Subscription actions
- Invoice actions
- Alert actions
- Cooldown actions

System Administrator visibility is aggregate and operational. Customer PII should not be exposed unnecessarily.

## Tenant Center

Tenant Center provides System Administrator management visibility for:

- Tenant directory
- Tenant health
- Branding state
- Domain readiness
- Tenant resources
- Tenant audit history
- Tenant settings visibility

Current custom-domain and deeper white-label fields are future-ready management surfaces.

## Scanner System

Scanner flow:

1. Customer card displays QR code.
2. Staff or Branch Manager opens scanner.
3. QR token redirects to `/scan/{token}`.
4. Server validates token, business, branch, program, and membership state.
5. Valid scan displays customer/program summary.
6. Stamp issuance uses existing guarded server action.

Public users cannot issue stamps.

## Monitoring Foundations

Existing monitoring surfaces:

- Platform Database Health
- Platform Health & Analytics
- Platform Audit Center
- Business Owner Notifications
- Activity alerts
- Failed login audit
- Scan events
- Cooldown events
- Billing Center
- Launch Readiness page

Future production operations should connect external uptime monitoring, error tracking, and database monitoring.
