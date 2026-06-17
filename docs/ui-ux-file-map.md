# LoyaltyBase UI/UX File Map

Version: 1.0  
Purpose: Editing map for product owners, UI/UX designers, future developers, QA, and external AI tools.

## Editing Principles

- Primary styling is Tailwind utility classes in `src/app/**/page.tsx` and shared components.
- Shared app shell is `src/components/DashboardShell.tsx`; changes affect all authenticated workspaces.
- Public customer card is `src/app/card/[token]/page.tsx`; changes affect customer-facing card sharing and QR display.
- Scanner experience is split between camera entry pages and token validation page.
- Business Owner pages rely heavily on `src/lib/business-owner.ts` for business-scoped context.
- Role-based redirects and access are enforced through `src/lib/session.ts`, `src/lib/roles.ts`, and route-level helpers.

## System Administrator Pages

### Route: `/platform`
Purpose: System Administrator operations dashboard.  
Main file: `src/app/platform/page.tsx`  
Connected components: `DashboardShell`, KPI cards, activity cards, platform navigation.  
Connected actions: Read-only Prisma queries.  
Styling source: Page-level Tailwind classes plus `DashboardShell`.  
Risk level when editing: High.  
Recommended UI files for redesign: `src/app/platform/page.tsx`, `src/components/DashboardShell.tsx`.

### Route: `/platform/businesses`
Purpose: Business directory, filtering, suspicious/test data badges, management links.  
Main file: `src/app/platform/businesses/page.tsx`  
Connected components: `SearchableCombobox`, badges, responsive business cards/table.  
Connected actions: `src/app/platform/businesses/actions.ts` for create/update/status actions.  
Forms: Filters, search, status/plan filters.  
Tables/Cards: Business table and mobile business cards.  
Risk level when editing: High.  
Recommended UI files for redesign: page file plus `BusinessForm`.

### Route: `/platform/businesses/new`
Purpose: Create business, owner, branch, subscription, and branding.  
Main file: `src/app/platform/businesses/new/page.tsx`  
Connected components: `BusinessForm`, `PlanBillingCycleFields`, `SearchableCombobox`.  
Connected actions: `src/app/platform/businesses/actions.ts`.  
Forms: Multi-section business creation form.  
Risk level when editing: High.

### Route: `/platform/businesses/[id]`
Purpose: Tenant detail, subscription, billing profile, usage, health.  
Main file: `src/app/platform/businesses/[id]/page.tsx`  
Connected components: Dashboard cards, billing tab/profile sections.  
Data source: Prisma business, subscriptions, invoices, payments, users, branches.  
Risk level: High.

### Route: `/platform/businesses/[id]/edit`
Purpose: Edit business details and status.  
Main file: `src/app/platform/businesses/[id]/edit/page.tsx`  
Connected actions: `src/app/platform/businesses/actions.ts`.  
Risk level: High.

### Route: `/platform/plans`
Purpose: Subscription plan management overview and commercial plan cards.  
Main file: `src/app/platform/plans/page.tsx`  
Connected components: Plan cards, KPI cards, table.  
Data source: `subscription_plans`, `business_subscriptions`.  
Risk level: Medium.  
Recommended redesign files: page file, `src/lib/subscription-plans.ts`.

### Route: `/platform/subscriptions`
Purpose: Subscription lifecycle management.  
Main file: `src/app/platform/subscriptions/page.tsx`  
Connected components: `SearchableCombobox`, compact action menus, status badges.  
Connected actions: `src/app/platform/subscriptions/actions.ts`.  
Forms: Status/plan/expiry filters, lifecycle action forms.  
Tables/Cards: Desktop subscription table, mobile cards.  
Risk level: High.

### Route: `/platform/invoices`
Purpose: Invoice dashboard and filtering.  
Main file: `src/app/platform/invoices/page.tsx`  
Connected actions: `src/app/platform/invoices/actions.ts`.  
Tables/Cards: Invoice table and mobile cards.  
Risk level: Medium.

### Route: `/platform/invoices/new`
Purpose: Create invoice.  
Main file: `src/app/platform/invoices/new/page.tsx`  
Connected components: `SearchableCombobox`.  
Actions: invoice creation action.  
Risk level: High.

### Route: `/platform/invoices/[id]`
Purpose: Invoice detail, payment history, audit log.  
Main file: `src/app/platform/invoices/[id]/page.tsx`  
Risk level: Medium.

### Route: `/platform/users`
Purpose: System user directory with filters and role/status badges.  
Main file: `src/app/platform/users/page.tsx`  
Connected components: `SearchableCombobox`, role badges.  
Data source: `users`, `businesses`, `branches`.  
Risk level: Medium.

### Route: `/platform/health-analytics`
Purpose: Platform health and analytics.  
Main file: `src/app/platform/health-analytics/page.tsx`  
Data source: counts, alerts, login failures, usage metrics.  
Risk level: Medium.

### Route: `/platform/audit-center`
Purpose: Enterprise audit event monitoring.  
Main file: `src/app/platform/audit-center/page.tsx`  
Connected components: KPI cards, filters, details drawer, timeline, export buttons.  
Data source: `audit_events`, users, businesses, branches.  
Risk level: High.

### Route: `/platform/billing-center`
Purpose: Commercial billing dashboard.  
Main file: `src/app/platform/billing-center/page.tsx`  
Data source: subscriptions, plans, invoices, payments.  
Risk level: High.

### Route: `/platform/tenant-center`
Purpose: Tenant and white-label management visibility.  
Main file: `src/app/platform/tenant-center/page.tsx`  
Data source: businesses, branding, domains/settings placeholders, health metrics.  
Risk level: Medium.

### Route: `/platform/settings`
Purpose: Platform settings console.  
Main file: `src/app/platform/settings/page.tsx`  
Connected actions: `src/app/platform/settings/actions.ts`.  
Forms: Demo Mode toggle and settings forms.  
Cards: Environment, Demo Mode, Health, Security, Notifications, Audit Logs tabs.  
Risk level: High.

### Route: `/platform/database`
Purpose: Database visibility/admin status page.  
Main file: `src/app/platform/database/page.tsx`  
Risk level: Medium.

### Route: `/platform/launch-readiness`
Purpose: Launch readiness checklist.  
Main file: `src/app/platform/launch-readiness/page.tsx`  
Risk level: Low.

## Business Owner Pages

### Route: `/dashboard`
Purpose: Business operations dashboard.  
Main file: `src/app/dashboard/page.tsx`  
Connected components: `DashboardShell`, KPI cards, quick actions, activity cards.  
Connected actions: `src/app/dashboard/actions.ts`.  
Data source: `getBusinessOwnerContext`, Prisma business-scoped metrics.  
Cards: Business summary, quick actions, today's performance, recent activity, customers, program performance.  
Risk level: High.  
Recommended UI files for redesign: `src/app/dashboard/page.tsx`, `src/lib/business-owner.ts`.

### Route: `/dashboard/customers`
Purpose: Customer list, filters, search, customer actions.  
Main file: `src/app/dashboard/customers/page.tsx`  
Connected actions: `src/app/dashboard/actions.ts`, card share actions.  
Forms: Search/filter forms.  
Tables/Cards: Customer table and mobile cards.  
Risk level: High.

### Route: `/dashboard/customers/new`
Purpose: Customer enrollment.  
Main file: `src/app/dashboard/customers/new/page.tsx`  
Connected actions: `src/app/dashboard/actions.ts`.  
Forms: Customer details, phone normalization, program enrollment.  
Risk level: High.

### Route: `/dashboard/customers/[id]`
Purpose: Customer 360 profile.  
Main file: `src/app/dashboard/customers/[id]/page.tsx`  
Connected components: public card controls, tabs, timeline, alert summaries, messages, referrals.  
Actions: card enable/disable, scan token control, WhatsApp share, engagement/message actions.  
Risk level: Very High.  
Recommended UI files for redesign: this page, `src/app/card/[token]/page.tsx`, `src/lib/customer-tiers.ts`.

### Route: `/dashboard/customers/[id]/edit`
Purpose: Edit customer details.  
Main file: `src/app/dashboard/customers/[id]/edit/page.tsx`  
Connected actions: customer update action.  
Risk level: High.

### Route: `/dashboard/programs`
Purpose: Loyalty program list and performance.  
Main file: `src/app/dashboard/programs/page.tsx`  
Connected actions: `src/app/dashboard/programs/actions.ts`.  
Tables/Cards: program table/cards.  
Risk level: High.

### Route: `/dashboard/programs/new`
Purpose: Create loyalty program.  
Main file: `src/app/dashboard/programs/new/page.tsx`  
Connected actions: `src/app/dashboard/programs/actions.ts`.  
Forms: program details, stamp/reward/referral reward settings.  
Risk level: High.

### Route: `/dashboard/programs/[id]`
Purpose: Program detail and performance.  
Main file: `src/app/dashboard/programs/[id]/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/programs/[id]/edit`
Purpose: Edit program.  
Main file: `src/app/dashboard/programs/[id]/edit/page.tsx`  
Connected actions: program update action.  
Risk level: High.

### Route: `/dashboard/programs/[id]/customers`
Purpose: Program customer list.  
Main file: `src/app/dashboard/programs/[id]/customers/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/branches`
Purpose: Branch management and branch limits.  
Main file: `src/app/dashboard/branches/page.tsx`  
Connected actions: `src/app/dashboard/actions.ts`.  
Forms: branch create/update/status.  
Risk level: High.

### Route: `/dashboard/staff`
Purpose: Staff and branch manager management.  
Main file: `src/app/dashboard/staff/page.tsx`  
Actions: staff create/update/password reset.  
Risk level: High.

### Route: `/dashboard/staff/[id]`
Purpose: Staff account detail/security information.  
Main file: `src/app/dashboard/staff/[id]/page.tsx`  
Risk level: High.

### Route: `/dashboard/referrals`
Purpose: Referral center.  
Main file: `src/app/dashboard/referrals/page.tsx`  
Data source: referrals, referral rewards, referral events.  
Risk level: Medium.

### Route: `/dashboard/referrals/[id]`
Purpose: Referral detail.  
Main file: `src/app/dashboard/referrals/[id]/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/notifications`
Purpose: Alert center and notification governance.  
Main file: `src/app/dashboard/notifications/page.tsx`  
Actions: `src/app/dashboard/notifications/actions.ts`.  
Drawers/Panels: alert investigation/details.  
Risk level: High.

### Route: `/dashboard/notifications/[id]`
Purpose: Alert detail.  
Main file: `src/app/dashboard/notifications/[id]/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/engagement`
Purpose: Engagement center.  
Main file: `src/app/dashboard/engagement/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/engagement/[id]`
Purpose: Engagement event detail and message preparation.  
Main file: `src/app/dashboard/engagement/[id]/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/messages`
Purpose: Message outbox.  
Main file: `src/app/dashboard/messages/page.tsx`  
Actions: `src/app/dashboard/messages/actions.ts`.  
Risk level: Medium.

### Route: `/dashboard/messages/[id]`
Purpose: Message detail.  
Main file: `src/app/dashboard/messages/[id]/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/scanner`
Purpose: Business Owner scanner entry.  
Main file: `src/app/dashboard/scanner/page.tsx`  
Connected component: `CameraScanner`.  
Risk level: High.

### Route: `/dashboard/billing`
Purpose: Business subscription/billing view.  
Main file: `src/app/dashboard/billing/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/settings`
Purpose: Business settings, tier settings, communications, policies.  
Main file: `src/app/dashboard/settings/page.tsx`  
Risk level: High.

### Route: `/dashboard/branding`
Purpose: Business branding controls.  
Main file: `src/app/dashboard/branding/page.tsx`  
Risk level: Medium.

### Route: `/dashboard/profile`
Purpose: Business owner profile.  
Main file: `src/app/dashboard/profile/page.tsx`  
Risk level: Low.

### Route: `/dashboard/activity/[id]`
Purpose: Activity detail.  
Main file: `src/app/dashboard/activity/[id]/page.tsx`  
Risk level: Low.

### Route: `/dashboard/exports/[type]`
Purpose: CSV export endpoint.  
Main file: `src/app/dashboard/exports/[type]/route.ts`  
Risk level: High because it exposes business data.

## Branch Manager Pages

Routes: `/branch`, `/branch/customers`, `/branch/customers/new`, `/branch/customers/[id]`, `/branch/programs`, `/branch/programs/[id]`, `/branch/programs/[id]/customers`, `/branch/scanner`.  
Main files: `src/app/branch/**/page.tsx`.  
Actions: `src/app/branch/customers/actions.ts`, `src/app/branch/programs/actions.ts`, `src/app/branch/scanner/actions.ts`.  
Purpose: Branch-scoped operations, customer views, program views, scanner.  
Risk level: High when changing customer/scanner pages; Medium otherwise.

## Staff Pages

Routes: `/staff`, `/staff/customers/new`, `/staff/customers/success`, `/staff/programs`, `/staff/scanner`.  
Main files: `src/app/staff/**/page.tsx`.  
Actions: `src/app/staff/customers/actions.ts`, `src/app/staff/scanner/actions.ts`.  
Purpose: Staff dashboard, customer enrollment, scanner, program visibility.  
Risk level: High for scanner/enrollment; Low-Medium for list pages.

## Public Pages

### Route: `/`
Purpose: Premium product homepage.  
Main file: `src/app/page.tsx`  
Risk level: Low for business logic; High for brand presentation.

### Route: `/login`
Purpose: Authentication.  
Main file: `src/app/login/page.tsx`  
Actions: `src/app/login/actions.ts`.  
Component: `LoginForm`.  
Risk level: Very High.

### Route: `/logout`
Purpose: Session destruction.  
Main file: `src/app/logout/route.ts`  
Risk level: High.

### Route: `/change-password`
Purpose: Forced password change.  
Main file: `src/app/change-password/page.tsx`  
Actions: `src/app/change-password/actions.ts`.  
Risk level: High.

### Route: `/card/[token]`
Purpose: Public customer loyalty card.  
Main file: `src/app/card/[token]/page.tsx`  
Actions: `src/app/card-share-actions.ts`.  
Risk level: Very High.

### Route: `/scan/[token]`
Purpose: Scan token validation and stamp/reward workflow.  
Main file: `src/app/scan/[token]/page.tsx`  
Actions: `src/app/scan/actions.ts`.  
Risk level: Very High.

### Route: `/referral/[code]`
Purpose: Referral landing page.  
Main file: `src/app/referral/[code]/page.tsx`  
Risk level: High.

### Route: `/api/session/idle-logout`
Purpose: Idle-session logout endpoint.  
Main file: `src/app/api/session/idle-logout/route.ts`  
Risk level: High.

## Shared Components

- `DashboardShell`: authenticated shell, nav, logout, demo banner, idle timeout.
- `CameraScanner`: camera QR scanner, manual fallback, diagnostics.
- `SearchableCombobox`: scalable selector for large lists.
- `LoginForm`: login UI and password visibility.
- `BusinessForm`: System Administrator business onboarding.
- `PlanBillingCycleFields`: plan and billing cycle selector.
- `CsrfInput`: CSRF hidden field helper.
- `IdleSessionTimeout`: 15-minute inactivity sign-out.

## UI/UX Editing Map for External Designers

Recommended redesign entry points:

1. Homepage: `src/app/page.tsx`.
2. Auth: `src/app/login/page.tsx`, `src/components/LoginForm.tsx`.
3. Global shell/navigation: `src/components/DashboardShell.tsx`.
4. System Administrator dashboard: `src/app/platform/page.tsx`.
5. Business Owner dashboard: `src/app/dashboard/page.tsx`.
6. Customer 360: `src/app/dashboard/customers/[id]/page.tsx`.
7. Public card: `src/app/card/[token]/page.tsx`.
8. Scanner: `src/components/CameraScanner.tsx`, `src/app/scan/[token]/page.tsx`.
9. Plans/subscriptions: `src/app/platform/plans/page.tsx`, `src/app/platform/subscriptions/page.tsx`, `src/components/PlanBillingCycleFields.tsx`.
10. Shared selectors: `src/components/SearchableCombobox.tsx`.

