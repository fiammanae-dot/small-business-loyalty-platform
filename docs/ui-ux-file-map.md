# LoyaltyBase UI/UX File Map

Last rebuilt: 2026-06-19

Scope: verified from the real project tree under `src/app`, `src/components`, `src/lib`, `prisma`, and `tests`.

Rules used:
- Only routes with real `page.tsx`, `route.ts`, or `layout.tsx` files are listed.
- No guessed folders or invented component names are included.
- Shared components are listed only if they exist under `src/components`.
- Most dashboards are built as inline sections inside their `page.tsx` files, not separate section components.

## Verified Project Structure

Verified root folders:
- `src/app`
- `src/components`
- `src/lib`
- `prisma`
- `tests`

Verified route/layout files:
- 66 page routes with `page.tsx`
- 3 API/route handlers with `route.ts`
- 1 root layout with `layout.tsx`

Verified shared components:
- 20 files in `src/components`

## Route Map

### Public And Auth Routes

Route: `/`
Main file: `src/app/page.tsx`
Purpose: Public LoyaltyBase marketing homepage.
Role access: Public.
Imported components: None from `src/components`; uses `next/link` and `lucide-react`.
Local sections/functions: `PublicHeader`, `HeroSection`, `LoyaltyCardPreview`, `TrustSection`, `FeaturesSection`, `HowItWorksSection`, `PricingTeaserSection`, `FaqSection`, `Footer`, `SectionHeading`, `FeatureCard`, `TrustMetric`.
Connected actions: None.
Connected lib/data files: None.
Tables/cards/forms/modals: Marketing cards, CTA buttons, pricing teaser card, FAQ cards.
Styling method: Tailwind classes inline in the page.
Mobile layout notes: Uses responsive grids and stacked CTA buttons.
Risk level when editing: Medium. Public conversion page; self-contained.
Safe redesign notes: Safe to redesign visually if `/login` links and public access remain.
Files to send to external UI/UX AI: `src/app/page.tsx`, `src/app/globals.css`.

Route: `/login`
Main file: `src/app/login/page.tsx`
Purpose: Authentication login screen.
Role access: Public; authenticated users redirect by role.
Imported components: `LoginForm`.
Local sections/functions: Login card wrapper.
Connected actions: `src/app/login/actions.ts`.
Connected lib/data files: `src/lib/csrf.ts`, `src/lib/session.ts`.
Tables/cards/forms/modals: Login form.
Styling method: Tailwind.
Mobile layout notes: Centered single-column card.
Risk level when editing: High. Affects all sign-in flows.
Safe redesign notes: Keep CSRF token and `LoginForm` wired.
Files to send to external UI/UX AI: `src/app/login/page.tsx`, `src/components/LoginForm.tsx`.

Route: `/forgot-password`
Main file: `src/app/forgot-password/page.tsx`
Purpose: Password reset request page.
Role access: Public; authenticated users redirect by role.
Imported components: `ForgotPasswordForm`.
Local sections/functions: Password reset card wrapper.
Connected actions: `src/app/forgot-password/actions.ts`.
Connected lib/data files: `src/lib/csrf.ts`, `src/lib/session.ts`, `src/lib/password-reset.ts`.
Tables/cards/forms/modals: Email request form.
Styling method: Tailwind.
Mobile layout notes: Centered single-column card.
Risk level when editing: High. Security UX.
Safe redesign notes: Keep generic success messaging.
Files to send to external UI/UX AI: `src/app/forgot-password/page.tsx`, `src/components/ForgotPasswordForm.tsx`.

Route: `/reset-password`
Main file: `src/app/reset-password/page.tsx`
Purpose: Password reset completion page.
Role access: Public; authenticated users redirect by role.
Imported components: `ResetPasswordForm`.
Local sections/functions: Reset card wrapper and missing-token state.
Connected actions: `src/app/reset-password/actions.ts`.
Connected lib/data files: `src/lib/csrf.ts`, `src/lib/session.ts`, `src/lib/password-reset.ts`.
Tables/cards/forms/modals: New password form.
Styling method: Tailwind.
Mobile layout notes: Centered single-column card.
Risk level when editing: High. Security UX.
Safe redesign notes: Keep token hidden input and password requirements visible.
Files to send to external UI/UX AI: `src/app/reset-password/page.tsx`, `src/components/ResetPasswordForm.tsx`.

Route: `/change-password`
Main file: `src/app/change-password/page.tsx`
Purpose: Forced password change page.
Role access: Authenticated user.
Imported components: `ChangePasswordForm`.
Local sections/functions: Password change shell card.
Connected actions: `src/app/change-password/actions.ts`.
Connected lib/data files: `src/lib/csrf.ts`, `src/lib/session.ts`.
Tables/cards/forms/modals: Change password form.
Styling method: Tailwind.
Mobile layout notes: Centered card.
Risk level when editing: High.
Safe redesign notes: Keep CSRF and forced-change copy.
Files to send to external UI/UX AI: `src/app/change-password/page.tsx`, `src/components/ChangePasswordForm.tsx`.

Route: `/logout`
Main file: `src/app/logout/route.ts`
Purpose: Clears session and redirects to login.
Role access: Authenticated or public request.
Imported components: None.
Local sections/functions: Route handler.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`.
Tables/cards/forms/modals: None.
Styling method: Not applicable.
Mobile layout notes: Not applicable.
Risk level when editing: High.
Safe redesign notes: Do not alter unless changing auth flow.
Files to send to external UI/UX AI: None.

Route: `/api/session/idle-logout`
Main file: `src/app/api/session/idle-logout/route.ts`
Purpose: Idle-session logout endpoint.
Role access: Session endpoint.
Imported components: None.
Local sections/functions: Route handler.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`.
Tables/cards/forms/modals: None.
Styling method: Not applicable.
Mobile layout notes: Not applicable.
Risk level when editing: High.
Safe redesign notes: Not a UI file.
Files to send to external UI/UX AI: None.

### System Administrator Routes

Route: `/platform`
Main file: `src/app/platform/page.tsx`
Purpose: System Administrator operations dashboard.
Role access: System Administrator only via `requireRole("PLATFORM_OWNER")`.
Imported components: `DashboardShell`, `PlatformCards`.
Local sections/functions: `PlatformHealthCard`, `KpiCard`, `QuickAction`, `SeverityBadge`, activity builders and filters.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/platform-settings.ts`, `src/lib/format.ts`, `src/lib/roles.ts`.
Tables/cards/forms/modals: KPI cards, platform health card, quick actions, management cards, recent activity filter form.
Styling method: Tailwind.
Mobile layout notes: Responsive KPI grid and stacked filters.
Risk level when editing: High. Primary admin dashboard.
Safe redesign notes: Keep role guard and health data source intact.
Files to send to external UI/UX AI: `src/app/platform/page.tsx`, `src/components/DashboardShell.tsx`, `src/components/PlatformCards.tsx`.

Route: `/platform/businesses`
Main file: `src/app/platform/businesses/page.tsx`
Purpose: Business directory, filters, actions.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`, `StatusBadge`.
Local sections/functions: Filter toolbar, mobile business cards, desktop table, suspicious data badge helpers.
Connected actions: `src/app/platform/businesses/actions.ts`.
Connected lib/data files: `src/lib/prisma.ts`, `src/lib/session.ts`, `src/lib/roles.ts`, `src/lib/format.ts`, `src/lib/subscriptions.ts`.
Tables/cards/forms/modals: Search/filter form, result count, mobile cards, desktop table, action buttons.
Styling method: Tailwind.
Mobile layout notes: Converts rows to cards.
Risk level when editing: High.
Safe redesign notes: Preserve filters, status actions, and tenant links.
Files to send to external UI/UX AI: `src/app/platform/businesses/page.tsx`, `src/components/SearchableCombobox.tsx`, `src/components/StatusBadge.tsx`.

Route: `/platform/businesses/new`
Main file: `src/app/platform/businesses/new/page.tsx`
Purpose: Business creation.
Role access: System Administrator only.
Imported components: `DashboardShell`, `BusinessForm`.
Local sections/functions: Page shell.
Connected actions: `src/app/platform/businesses/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Multi-step `BusinessForm`.
Styling method: Tailwind.
Mobile layout notes: Form stacks by section.
Risk level when editing: High.
Safe redesign notes: Keep plan fields and create action binding.
Files to send to external UI/UX AI: `src/app/platform/businesses/new/page.tsx`, `src/components/BusinessForm.tsx`.

Route: `/platform/businesses/[id]`
Main file: `src/app/platform/businesses/[id]/page.tsx`
Purpose: Business detail/profile.
Role access: System Administrator only.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: `InfoRow` and business profile sections.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards for business, owner, branches, billing profile.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep all links to edit and related billing.
Files to send to external UI/UX AI: `src/app/platform/businesses/[id]/page.tsx`, `src/components/StatusBadge.tsx`.

Route: `/platform/businesses/[id]/edit`
Main file: `src/app/platform/businesses/[id]/edit/page.tsx`
Purpose: Business edit form.
Role access: System Administrator only.
Imported components: `DashboardShell`, `BusinessForm`.
Local sections/functions: Edit shell.
Connected actions: `src/app/platform/businesses/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: `BusinessForm`.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Keep hidden IDs and update action.
Files to send to external UI/UX AI: `src/app/platform/businesses/[id]/edit/page.tsx`, `src/components/BusinessForm.tsx`.

Route: `/platform/plans`
Main file: `src/app/platform/plans/page.tsx`
Purpose: Subscription plan management and analysis.
Role access: System Administrator only.
Imported components: `DashboardShell`.
Local sections/functions: KPI cards, search/sort controls, plan cards, utilization indicators, detail table.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/subscription-plans.ts`.
Tables/cards/forms/modals: Plan KPI cards, plan cards, table.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Preserve three-plan language and code-based plan model.
Files to send to external UI/UX AI: `src/app/platform/plans/page.tsx`.

Route: `/platform/subscriptions`
Main file: `src/app/platform/subscriptions/page.tsx`
Purpose: Subscription lifecycle management.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`, `StatusBadge`.
Local sections/functions: Compact filter toolbar, mobile cards, desktop table, action forms/dropdowns.
Connected actions: `src/app/platform/subscriptions/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`, `src/lib/subscriptions.ts`.
Tables/cards/forms/modals: Filters, table/cards, lifecycle action forms.
Styling method: Tailwind.
Mobile layout notes: Mobile cards with compact actions.
Risk level when editing: High.
Safe redesign notes: Preserve action forms and billing-cycle displays.
Files to send to external UI/UX AI: `src/app/platform/subscriptions/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/platform/invoices`
Main file: `src/app/platform/invoices/page.tsx`
Purpose: Invoice list and filters.
Role access: System Administrator only.
Imported components: `DashboardShell`, `InvoiceBadge`, `SearchableCombobox`.
Local sections/functions: Filter controls, mobile cards, desktop table.
Connected actions: `src/app/platform/invoices/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/billing.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Filter form, table/cards, invoice status badges.
Styling method: Tailwind.
Mobile layout notes: Rows convert to cards.
Risk level when editing: Medium.
Safe redesign notes: Keep invoice status mapping via `InvoiceBadge`.
Files to send to external UI/UX AI: `src/app/platform/invoices/page.tsx`, `src/components/InvoiceBadge.tsx`.

Route: `/platform/invoices/new`
Main file: `src/app/platform/invoices/new/page.tsx`
Purpose: Create invoice form.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Invoice form.
Connected actions: `src/app/platform/invoices/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Form with business/subscription comboboxes.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Keep selected subscription mapping.
Files to send to external UI/UX AI: `src/app/platform/invoices/new/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/platform/invoices/[id]`
Main file: `src/app/platform/invoices/[id]/page.tsx`
Purpose: Invoice detail and payment history.
Role access: System Administrator only.
Imported components: `DashboardShell`, `InvoiceBadge`.
Local sections/functions: `Info` sections and payment/audit list.
Connected actions: `src/app/platform/invoices/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/billing.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards, payment form/list.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep record-payment controls wired.
Files to send to external UI/UX AI: `src/app/platform/invoices/[id]/page.tsx`, `src/components/InvoiceBadge.tsx`.

Route: `/platform/users`
Main file: `src/app/platform/users/page.tsx`
Purpose: System user directory with filters.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`, `StatusBadge`.
Local sections/functions: Filter toolbar, quick chips, mobile cards, desktop table.
Connected actions: None found in page.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/roles.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Filter form, result count, user cards/table.
Styling method: Tailwind.
Mobile layout notes: Mobile card layout.
Risk level when editing: Medium.
Safe redesign notes: Preserve role/status labels.
Files to send to external UI/UX AI: `src/app/platform/users/page.tsx`, `src/components/SearchableCombobox.tsx`, `src/components/StatusBadge.tsx`.

Route: `/platform/audit-center`
Main file: `src/app/platform/audit-center/page.tsx`
Purpose: Audit monitoring center.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: KPI filters, table, drawer-style details, timeline/security summaries.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: KPI cards, filter form, audit event table, detail drawer/panel.
Styling method: Tailwind.
Mobile layout notes: Dense table risk; filters stack.
Risk level when editing: High.
Safe redesign notes: Keep platform-only access and no PII expansion.
Files to send to external UI/UX AI: `src/app/platform/audit-center/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/platform/billing-center`
Main file: `src/app/platform/billing-center/page.tsx`
Purpose: Commercial billing dashboard.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Revenue KPIs, charts/visual panels, subscription table, renewal/trial sections.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/billing.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: KPI cards, filters, billing tables.
Styling method: Tailwind.
Mobile layout notes: Cards/tables stack.
Risk level when editing: High.
Safe redesign notes: Do not alter billing calculations.
Files to send to external UI/UX AI: `src/app/platform/billing-center/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/platform/tenant-center`
Main file: `src/app/platform/tenant-center/page.tsx`
Purpose: Tenant and white-label management view.
Role access: System Administrator only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Tenant KPIs, directory, health badges, resource/branding/domain panels.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Tenant filter form, tenant cards/table, health indicators.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Treat custom domain/white-label areas as management UI only.
Files to send to external UI/UX AI: `src/app/platform/tenant-center/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/platform/settings`
Main file: `src/app/platform/settings/page.tsx`
Purpose: Tabbed platform settings console.
Role access: System Administrator only.
Imported components: `DashboardShell`.
Local sections/functions: Environment card, demo mode panel, health summary, tabs for general/security/notifications/demo/audit.
Connected actions: `src/app/platform/settings/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/platform-settings.ts`, `src/lib/prisma.ts`, `src/lib/database-health.ts`.
Tables/cards/forms/modals: Settings cards, demo mode form/toggle, tab navigation.
Styling method: Tailwind.
Mobile layout notes: Tabs/buttons wrap.
Risk level when editing: High.
Safe redesign notes: Keep demo mode action and environment read-only values.
Files to send to external UI/UX AI: `src/app/platform/settings/page.tsx`.

Route: `/platform/health-analytics`
Main file: `src/app/platform/health-analytics/page.tsx`
Purpose: Platform analytics and health reports.
Role access: System Administrator only.
Imported components: `DashboardShell`.
Local sections/functions: KPI cards, trend panels, top-10 tables, export buttons.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: KPI cards, chart-like panels, top business tables.
Styling method: Tailwind.
Mobile layout notes: Grids stack.
Risk level when editing: Medium.
Safe redesign notes: Charts can be upgraded visually but keep aggregate-only data.
Files to send to external UI/UX AI: `src/app/platform/health-analytics/page.tsx`.

Route: `/platform/database`
Main file: `src/app/platform/database/page.tsx`
Purpose: Database health check.
Role access: System Administrator only.
Imported components: `DashboardShell`.
Local sections/functions: Health status cards.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/database-health.ts`.
Tables/cards/forms/modals: Health cards.
Styling method: Tailwind.
Mobile layout notes: Simple stack.
Risk level when editing: Low.
Safe redesign notes: Keep read-only.
Files to send to external UI/UX AI: `src/app/platform/database/page.tsx`.

Route: `/platform/launch-readiness`
Main file: `src/app/platform/launch-readiness/page.tsx`
Purpose: Read-only launch readiness checklist.
Role access: System Administrator only.
Imported components: `DashboardShell`.
Local sections/functions: Checklist status cards.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`.
Tables/cards/forms/modals: Checklist cards.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Low.
Safe redesign notes: Keep read-only indicators.
Files to send to external UI/UX AI: `src/app/platform/launch-readiness/page.tsx`.

### Business Owner Routes

Route: `/dashboard`
Main file: `src/app/dashboard/page.tsx`
Purpose: Business Owner operations dashboard.
Role access: Business Owner only via `getBusinessOwnerContext`.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: `HeaderSummary`, `SummaryTile`, `MainActions`, `TodayPerformance`, `MetricCard`, `RecentActivity`, `RecentCustomers`, `ProgramPerformance`, `getInitials`, `getCustomerName`.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/business-display.ts`, `src/lib/format.ts`, `src/lib/prisma.ts`, `src/lib/roles.ts`, `src/lib/subscriptions.ts`.
Tables/cards/forms/modals: Header summary, clickable KPI tiles, quick action cards, performance metrics, recent activity/customers/program panels.
Styling method: Tailwind.
Mobile layout notes: Compact grid stacks; dashboard intentionally reduced to key sections.
Risk level when editing: High.
Safe redesign notes: Keep section order and action links; do not reintroduce large search block or duplicated risk summaries.
Files to send to external UI/UX AI: `src/app/dashboard/page.tsx`, `src/components/DashboardShell.tsx`, `src/components/StatusBadge.tsx`.

Route: `/dashboard/customers`
Main file: `src/app/dashboard/customers/page.tsx`
Purpose: Business customer list and search.
Role access: Business Owner only.
Imported components: `CardShareActions`, `DashboardShell`, `StatusBadge`.
Local sections/functions: Search/filter form, mobile cards, desktop table, empty states.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`, `src/lib/phone.ts`, `src/lib/customer-cards.ts`, `src/lib/customer-tiers.ts`.
Tables/cards/forms/modals: Filter form, customer cards/table, WhatsApp/card actions.
Styling method: Tailwind.
Mobile layout notes: Cards replace table.
Risk level when editing: High.
Safe redesign notes: Preserve customer profile links and share controls.
Files to send to external UI/UX AI: `src/app/dashboard/customers/page.tsx`, `src/components/CardShareActions.tsx`, `src/components/StatusBadge.tsx`.

Route: `/dashboard/customers/new`
Main file: `src/app/dashboard/customers/new/page.tsx`
Purpose: Enroll customer.
Role access: Business Owner only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Enrollment form.
Connected actions: `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Customer enrollment form with program/branch selectors.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Keep field names and referral-code handling.
Files to send to external UI/UX AI: `src/app/dashboard/customers/new/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/dashboard/customers/[id]`
Main file: `src/app/dashboard/customers/[id]/page.tsx`
Purpose: Customer 360 profile.
Role access: Business Owner only.
Imported components: `DashboardShell`, `CardShareActions`, `CopyButton`, `StatusBadge`.
Local sections/functions: `CustomerHeader`, `KpiSummary`, `OverviewPanel`, `ProfilePanel`, `LoyaltyProgramsPanel`, `TimelineRow`, `RiskMetric`, `InsightMetric`, `SeverityBadge`, `StatusPill`, `Info`, `resolveCustomerTab`.
Connected actions: `toggleCardStatusAction`, `toggleProgramScanTokenAction` from `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/customer-cards.ts`, `src/lib/customer-tiers.ts`, `src/lib/format.ts`, `src/lib/prisma.ts`, `src/lib/programs.ts`, `src/lib/referrals.ts`.
Tables/cards/forms/modals: Header, KPI row, tabs, customer card panel, program progress cards, timeline, alerts/messages/redemptions/referrals sections, copy/toggle forms.
Styling method: Tailwind.
Mobile layout notes: Header/KPIs stack; tabs reduce long scrolling.
Risk level when editing: High. Large inline page with many sections and actions.
Safe redesign notes: Move visual sections carefully; keep card status, copy link, WhatsApp, scan token, engagement, messages, and tab query behavior.
Files to send to external UI/UX AI: `src/app/dashboard/customers/[id]/page.tsx`, `src/components/CardShareActions.tsx`, `src/components/CopyButton.tsx`, `src/components/StatusBadge.tsx`.

Route: `/dashboard/customers/[id]/edit`
Main file: `src/app/dashboard/customers/[id]/edit/page.tsx`
Purpose: Edit customer.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: Edit form.
Connected actions: `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Customer edit form.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: Medium.
Safe redesign notes: Preserve normalized phone validation.
Files to send to external UI/UX AI: `src/app/dashboard/customers/[id]/edit/page.tsx`.

Route: `/dashboard/programs`
Main file: `src/app/dashboard/programs/page.tsx`
Purpose: Loyalty program list, filters, KPIs.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: `KpiCard`, local `StatusBadge`, `EmptyPrograms`.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`, `src/lib/programs.ts`, `src/lib/roles.ts`.
Tables/cards/forms/modals: KPI cards, filter form, mobile cards, desktop table.
Styling method: Tailwind.
Mobile layout notes: Cards replace table.
Risk level when editing: Medium.
Safe redesign notes: Preserve create/view/edit/customers links.
Files to send to external UI/UX AI: `src/app/dashboard/programs/page.tsx`.

Route: `/dashboard/programs/new`
Main file: `src/app/dashboard/programs/new/page.tsx`
Purpose: Create loyalty program.
Role access: Business Owner only.
Imported components: `DashboardShell`, `ProgramForm`.
Local sections/functions: Shell wrapper.
Connected actions: `src/app/dashboard/programs/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`.
Tables/cards/forms/modals: `ProgramForm`.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Keep plan-limit messaging and field names.
Files to send to external UI/UX AI: `src/app/dashboard/programs/new/page.tsx`, `src/components/ProgramForm.tsx`.

Route: `/dashboard/programs/[id]`
Main file: `src/app/dashboard/programs/[id]/page.tsx`
Purpose: Program detail.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: `NotFound`, program stats/detail cards.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards and links.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep customer and edit navigation.
Files to send to external UI/UX AI: `src/app/dashboard/programs/[id]/page.tsx`.

Route: `/dashboard/programs/[id]/edit`
Main file: `src/app/dashboard/programs/[id]/edit/page.tsx`
Purpose: Edit program.
Role access: Business Owner only.
Imported components: `DashboardShell`, `ProgramForm`.
Local sections/functions: Shell/not-found.
Connected actions: `src/app/dashboard/programs/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: `ProgramForm`.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Keep update action binding.
Files to send to external UI/UX AI: `src/app/dashboard/programs/[id]/edit/page.tsx`, `src/components/ProgramForm.tsx`.

Route: `/dashboard/programs/[id]/customers`
Main file: `src/app/dashboard/programs/[id]/customers/page.tsx`
Purpose: Program customer enrollment/list.
Role access: Business Owner only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Customer selector, customer list.
Connected actions: `src/app/dashboard/programs/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Combobox form and list.
Styling method: Tailwind.
Mobile layout notes: Stacked controls.
Risk level when editing: Medium.
Safe redesign notes: Preserve program/customer IDs.
Files to send to external UI/UX AI: `src/app/dashboard/programs/[id]/customers/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/dashboard/referrals`
Main file: `src/app/dashboard/referrals/page.tsx`
Purpose: Referral center.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: `ReferralCard`, `Kpi`, `StatusPill`, `friendlyStatus`, `customerName`, `buildStatusCounts`.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: KPI row, referral filter form, referral cards, top referrers, qualification details accordion.
Styling method: Tailwind.
Mobile layout notes: Grid stacks.
Risk level when editing: Medium.
Safe redesign notes: Keep status/reward filters and detail links.
Files to send to external UI/UX AI: `src/app/dashboard/referrals/page.tsx`.

Route: `/dashboard/referrals/[id]`
Main file: `src/app/dashboard/referrals/[id]/page.tsx`
Purpose: Referral detail.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: Detail panels, event history.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards and history list.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Preserve customer links and audit/event display.
Files to send to external UI/UX AI: `src/app/dashboard/referrals/[id]/page.tsx`.

Route: `/dashboard/staff`
Main file: `src/app/dashboard/staff/page.tsx`
Purpose: Staff and Branch Manager management.
Role access: Business Owner only.
Imported components: `DashboardShell`, `SearchableCombobox`, `StaffPasswordResetAction`, `StatusBadge`.
Local sections/functions: Staff form, branch selector, staff table.
Connected actions: `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Create staff form, staff table, reset password action/modal.
Styling method: Tailwind.
Mobile layout notes: Table may be dense; form stacks.
Risk level when editing: High.
Safe redesign notes: Preserve reset permission boundaries and CSRF.
Files to send to external UI/UX AI: `src/app/dashboard/staff/page.tsx`, `src/components/StaffPasswordResetAction.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/dashboard/staff/[id]`
Main file: `src/app/dashboard/staff/[id]/page.tsx`
Purpose: Staff profile.
Role access: Business Owner only.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: `Info` cards and recent activity.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Profile cards, activity table/list.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep account security fields visible.
Files to send to external UI/UX AI: `src/app/dashboard/staff/[id]/page.tsx`.

Route: `/dashboard/branches`
Main file: `src/app/dashboard/branches/page.tsx`
Purpose: Branch management.
Role access: Business Owner only.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: Branch form/list.
Connected actions: `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Create branch form, branch cards.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Preserve branch limit and status controls.
Files to send to external UI/UX AI: `src/app/dashboard/branches/page.tsx`, `src/components/StatusBadge.tsx`.

Route: `/dashboard/scanner`
Main file: `src/app/dashboard/scanner/page.tsx`
Purpose: Business Owner camera scanner page.
Role access: Business Owner only.
Imported components: `DashboardShell`, `CameraScanner`.
Local sections/functions: Shell wrapper.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`.
Tables/cards/forms/modals: Camera scanner component.
Styling method: Tailwind through shell/component.
Mobile layout notes: CameraScanner is mobile-first.
Risk level when editing: High.
Safe redesign notes: Preserve manual token fallback.
Files to send to external UI/UX AI: `src/app/dashboard/scanner/page.tsx`, `src/components/CameraScanner.tsx`.

Route: `/dashboard/notifications`
Main file: `src/app/dashboard/notifications/page.tsx`
Purpose: Alert Center / risk investigation workspace.
Role access: Business Owner only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Summary cards, workflow tabs, branch risk overview, alert cards, action menu, investigation panel/drawer.
Connected actions: `src/app/dashboard/notifications/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/alert-labels.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Alert cards, filters, drawer/panel, action forms.
Styling method: Tailwind.
Mobile layout notes: Drawer should behave like full-screen/stacked panel.
Risk level when editing: High.
Safe redesign notes: Keep assign/review/escalate/resolve/dismiss forms.
Files to send to external UI/UX AI: `src/app/dashboard/notifications/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/dashboard/notifications/[id]`
Main file: `src/app/dashboard/notifications/[id]/page.tsx`
Purpose: Alert detail.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: Alert detail cards and review forms.
Connected actions: `src/app/dashboard/notifications/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/alert-labels.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards and alert action forms.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: High.
Safe redesign notes: Do not remove legacy detail route while list drawer exists.
Files to send to external UI/UX AI: `src/app/dashboard/notifications/[id]/page.tsx`.

Route: `/dashboard/billing`
Main file: `src/app/dashboard/billing/page.tsx`
Purpose: Business Owner billing view.
Role access: Business Owner only.
Imported components: `DashboardShell`, `InvoiceBadge`.
Local sections/functions: Subscription summary and invoice table/cards.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/billing.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Billing cards, invoice table.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Read-only business billing.
Files to send to external UI/UX AI: `src/app/dashboard/billing/page.tsx`, `src/components/InvoiceBadge.tsx`.

Route: `/dashboard/settings`
Main file: `src/app/dashboard/settings/page.tsx`
Purpose: Business settings including tier settings, subscription, communication info.
Role access: Business Owner only.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: Settings forms/cards.
Connected actions: `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/customer-tiers.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Tier settings form, subscription cards.
Styling method: Tailwind.
Mobile layout notes: Forms stack.
Risk level when editing: High.
Safe redesign notes: Preserve tier validation field names.
Files to send to external UI/UX AI: `src/app/dashboard/settings/page.tsx`.

Route: `/dashboard/profile`
Main file: `src/app/dashboard/profile/page.tsx`
Purpose: Business profile.
Role access: Business Owner only.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: `ReadOnly`.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/roles.ts`.
Tables/cards/forms/modals: Read-only profile cards.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Low.
Safe redesign notes: Read-only.
Files to send to external UI/UX AI: `src/app/dashboard/profile/page.tsx`.

Route: `/dashboard/branding`
Main file: `src/app/dashboard/branding/page.tsx`
Purpose: Business branding settings.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: Branding form/preview.
Connected actions: `src/app/dashboard/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`.
Tables/cards/forms/modals: Branding form and preview.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: Medium.
Safe redesign notes: Preserve color/name fields.
Files to send to external UI/UX AI: `src/app/dashboard/branding/page.tsx`.

Route: `/dashboard/engagement`
Main file: `src/app/dashboard/engagement/page.tsx`
Purpose: Engagement Center.
Role access: Business Owner only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Filters, event groups/cards/table.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/engagement.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: KPI cards, filters, event cards/table.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep consent/filter logic visible.
Files to send to external UI/UX AI: `src/app/dashboard/engagement/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/dashboard/engagement/[id]`
Main file: `src/app/dashboard/engagement/[id]/page.tsx`
Purpose: Engagement event detail and manual message preparation.
Role access: Business Owner only.
Imported components: `DashboardShell`, `CopyButton`.
Local sections/functions: Event details, copy/share controls, prepare-message forms.
Connected actions: `src/app/dashboard/messages/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/engagement.ts`, `src/lib/messages.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Detail cards, copy buttons, prepare buttons/forms.
Styling method: Tailwind.
Mobile layout notes: Buttons wrap.
Risk level when editing: Medium.
Safe redesign notes: Keep “prepared only, not sent automatically” messaging.
Files to send to external UI/UX AI: `src/app/dashboard/engagement/[id]/page.tsx`, `src/components/CopyButton.tsx`.

Route: `/dashboard/messages`
Main file: `src/app/dashboard/messages/page.tsx`
Purpose: Message outbox.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: Local `StatusBadge`, filters, message cards/table.
Connected actions: `src/app/dashboard/messages/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/messages.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: KPI cards, filters, mobile cards, desktop table.
Styling method: Tailwind.
Mobile layout notes: Cards replace table.
Risk level when editing: Medium.
Safe redesign notes: Preserve manual status actions.
Files to send to external UI/UX AI: `src/app/dashboard/messages/page.tsx`.

Route: `/dashboard/messages/[id]`
Main file: `src/app/dashboard/messages/[id]/page.tsx`
Purpose: Message detail.
Role access: Business Owner only.
Imported components: `DashboardShell`, `CopyButton`.
Local sections/functions: Message detail and actions.
Connected actions: `src/app/dashboard/messages/actions.ts`.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/messages.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards, copy buttons, mark/cancel forms.
Styling method: Tailwind.
Mobile layout notes: Buttons stack/wrap.
Risk level when editing: Medium.
Safe redesign notes: Do not add real provider sending.
Files to send to external UI/UX AI: `src/app/dashboard/messages/[id]/page.tsx`, `src/components/CopyButton.tsx`.

Route: `/dashboard/activity/[id]`
Main file: `src/app/dashboard/activity/[id]/page.tsx`
Purpose: Stamp activity detail.
Role access: Business Owner only.
Imported components: `DashboardShell`.
Local sections/functions: Activity detail cards.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Detail cards.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Low.
Safe redesign notes: Read-only.
Files to send to external UI/UX AI: `src/app/dashboard/activity/[id]/page.tsx`.

Route: `/dashboard/exports/[type]`
Main file: `src/app/dashboard/exports/[type]/route.ts`
Purpose: CSV export route.
Role access: Business Owner only.
Imported components: None.
Local sections/functions: Route handler.
Connected actions: None.
Connected lib/data files: `src/lib/business-owner.ts`, `src/lib/csv.ts`.
Tables/cards/forms/modals: None.
Styling method: Not applicable.
Mobile layout notes: Not applicable.
Risk level when editing: Medium.
Safe redesign notes: Not a UI file.
Files to send to external UI/UX AI: None.

### Branch Manager Routes

Route: `/branch`
Main file: `src/app/branch/page.tsx`
Purpose: Branch Manager dashboard.
Role access: Branch Manager only.
Imported components: `DashboardShell`.
Local sections/functions: KPI/action cards.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Dashboard cards and quick actions.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep branch-scoped counts.
Files to send to external UI/UX AI: `src/app/branch/page.tsx`, `src/components/DashboardShell.tsx`.

Route: `/branch/customers`
Main file: `src/app/branch/customers/page.tsx`
Purpose: Branch customer list.
Role access: Branch Manager only.
Imported components: `DashboardShell`, `StatusBadge`, `CardShareActions`.
Local sections/functions: Customer list.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/customer-cards.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Customer table/cards and card sharing.
Styling method: Tailwind.
Mobile layout notes: Cards/table hybrid.
Risk level when editing: Medium.
Safe redesign notes: Keep branch scope.
Files to send to external UI/UX AI: `src/app/branch/customers/page.tsx`, `src/components/CardShareActions.tsx`.

Route: `/branch/customers/new`
Main file: `src/app/branch/customers/new/page.tsx`
Purpose: Branch customer enrollment.
Role access: Branch Manager only.
Imported components: `DashboardShell`.
Local sections/functions: Enrollment form.
Connected actions: `src/app/branch/customers/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Customer form.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Preserve branch manager scope.
Files to send to external UI/UX AI: `src/app/branch/customers/new/page.tsx`.

Route: `/branch/customers/[id]`
Main file: `src/app/branch/customers/[id]/page.tsx`
Purpose: Branch customer profile.
Role access: Branch Manager only.
Imported components: `DashboardShell`, `StatusBadge`, `CardShareActions`.
Local sections/functions: `Info` sections and program progress.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/customer-cards.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Profile cards, card share actions.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep branch data restrictions.
Files to send to external UI/UX AI: `src/app/branch/customers/[id]/page.tsx`.

Route: `/branch/programs`
Main file: `src/app/branch/programs/page.tsx`
Purpose: Branch Manager program list.
Role access: Branch Manager only.
Imported components: `DashboardShell`.
Local sections/functions: Program list/cards.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Program cards/list.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Low.
Safe redesign notes: Read-oriented.
Files to send to external UI/UX AI: `src/app/branch/programs/page.tsx`.

Route: `/branch/programs/[id]`
Main file: `src/app/branch/programs/[id]/page.tsx`
Purpose: Branch program detail.
Role access: Branch Manager only.
Imported components: `DashboardShell`.
Local sections/functions: Program detail.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Detail cards.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Low.
Safe redesign notes: Read-oriented.
Files to send to external UI/UX AI: `src/app/branch/programs/[id]/page.tsx`.

Route: `/branch/programs/[id]/customers`
Main file: `src/app/branch/programs/[id]/customers/page.tsx`
Purpose: Branch program customer list/enrollment.
Role access: Branch Manager only.
Imported components: `DashboardShell`, `SearchableCombobox`.
Local sections/functions: Customer combobox and list.
Connected actions: `src/app/branch/programs/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Combobox, list/cards.
Styling method: Tailwind.
Mobile layout notes: Stacked controls.
Risk level when editing: Medium.
Safe redesign notes: Keep branch/program scope.
Files to send to external UI/UX AI: `src/app/branch/programs/[id]/customers/page.tsx`, `src/components/SearchableCombobox.tsx`.

Route: `/branch/scanner`
Main file: `src/app/branch/scanner/page.tsx`
Purpose: Branch Manager scanner page.
Role access: Branch Manager only.
Imported components: `DashboardShell`, `CameraScanner`.
Local sections/functions: Shell wrapper.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`.
Tables/cards/forms/modals: Camera scanner component.
Styling method: Tailwind.
Mobile layout notes: Mobile-first scanner.
Risk level when editing: High.
Safe redesign notes: Keep manual fallback and back link.
Files to send to external UI/UX AI: `src/app/branch/scanner/page.tsx`, `src/components/CameraScanner.tsx`.

### Staff Routes

Route: `/staff`
Main file: `src/app/staff/page.tsx`
Purpose: Staff dashboard.
Role access: Staff only.
Imported components: `DashboardShell`.
Local sections/functions: KPI/action cards.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Staff activity cards and quick scanner action.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Medium.
Safe redesign notes: Keep scanner prominent.
Files to send to external UI/UX AI: `src/app/staff/page.tsx`, `src/components/DashboardShell.tsx`.

Route: `/staff/customers/new`
Main file: `src/app/staff/customers/new/page.tsx`
Purpose: Staff customer enrollment.
Role access: Staff only.
Imported components: `DashboardShell`.
Local sections/functions: Enrollment form.
Connected actions: `src/app/branch/customers/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Customer form.
Styling method: Tailwind.
Mobile layout notes: Form stacks.
Risk level when editing: High.
Safe redesign notes: Preserve staff permissions and no reward redemption by staff.
Files to send to external UI/UX AI: `src/app/staff/customers/new/page.tsx`.

Route: `/staff/customers/success`
Main file: `src/app/staff/customers/success/page.tsx`
Purpose: Post-enrollment success screen.
Role access: Staff only.
Imported components: `DashboardShell`, `CardShareActions`.
Local sections/functions: Success details.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`, `src/lib/customer-cards.ts`.
Tables/cards/forms/modals: Success card, WhatsApp/share actions.
Styling method: Tailwind.
Mobile layout notes: Card stacks.
Risk level when editing: Medium.
Safe redesign notes: Keep customer card delivery action.
Files to send to external UI/UX AI: `src/app/staff/customers/success/page.tsx`, `src/components/CardShareActions.tsx`.

Route: `/staff/programs`
Main file: `src/app/staff/programs/page.tsx`
Purpose: Staff program list.
Role access: Staff only.
Imported components: `DashboardShell`.
Local sections/functions: Program cards/list.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Program list/cards.
Styling method: Tailwind.
Mobile layout notes: Cards stack.
Risk level when editing: Low.
Safe redesign notes: Read-oriented.
Files to send to external UI/UX AI: `src/app/staff/programs/page.tsx`.

Route: `/staff/scanner`
Main file: `src/app/staff/scanner/page.tsx`
Purpose: Staff scanner page.
Role access: Staff only.
Imported components: `DashboardShell`, `CameraScanner`.
Local sections/functions: Shell wrapper.
Connected actions: None.
Connected lib/data files: `src/lib/session.ts`.
Tables/cards/forms/modals: Camera scanner component.
Styling method: Tailwind.
Mobile layout notes: Mobile-first scanner.
Risk level when editing: High.
Safe redesign notes: Keep manual fallback.
Files to send to external UI/UX AI: `src/app/staff/scanner/page.tsx`, `src/components/CameraScanner.tsx`.

### Public Customer And Scan Routes

Route: `/card/[token]`
Main file: `src/app/card/[token]/page.tsx`
Purpose: Public customer loyalty card.
Role access: Public by card token.
Imported components: `CardShareActions`, `ReferralShareActions`.
Local sections/functions: `TierBadgePanel`, `PrimaryRewardPanel`, `ProgramRewardCard`, `Info`, `CardUnavailable`.
Connected actions: `src/app/card-share-actions.ts`.
Connected lib/data files: `src/lib/customer-cards.ts`, `src/lib/customer-tiers.ts`, `src/lib/format.ts`, `src/lib/phone.ts`, `src/lib/programs.ts`, `src/lib/referrals.ts`, `src/lib/prisma.ts`.
Tables/cards/forms/modals: Wallet-style card, tier badge, reward progress, QR code, save/share section, referral section, card details.
Styling method: Tailwind and inline branding colors.
Mobile layout notes: Mobile wallet-style layout; QR remains prominent.
Risk level when editing: High. Public customer experience and QR scanning depend on this.
Safe redesign notes: Do not expose internal IDs; keep QR and permanent card URL.
Files to send to external UI/UX AI: `src/app/card/[token]/page.tsx`, `src/components/CardShareActions.tsx`, `src/components/ReferralShareActions.tsx`.

Route: `/scan/[token]`
Main file: `src/app/scan/[token]/page.tsx`
Purpose: Scan validation and stamp issuance/reward redemption screen.
Role access: Authenticated Business Owner, Branch Manager, or Staff depending on permissions.
Imported components: `DashboardShell`, `StatusBadge`.
Local sections/functions: Validation banners, customer summary, stamp issuance section, scan details, reward redemption controls, invalid/wrong-business states.
Connected actions: `src/app/scan/actions.ts`.
Connected lib/data files: `src/lib/session.ts`, `src/lib/scan.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`, `src/lib/programs.ts`, `src/lib/rewards.ts`.
Tables/cards/forms/modals: Status banners, customer cards, stamp issuance forms, reward redemption form.
Styling method: Tailwind.
Mobile layout notes: Sections stack; primary action should remain high on page.
Risk level when editing: High. Scanner/stamp/reward workflows.
Safe redesign notes: UI order can change; do not change action logic or hidden field names.
Files to send to external UI/UX AI: `src/app/scan/[token]/page.tsx`, `src/app/scan/actions.ts`, `src/components/StatusBadge.tsx`.

Route: `/referral/[code]`
Main file: `src/app/referral/[code]/page.tsx`
Purpose: Public referral landing page.
Role access: Public by referral code.
Imported components: None from `src/components`.
Local sections/functions: Valid/invalid referral card sections.
Connected actions: None.
Connected lib/data files: `src/lib/referrals.ts`, `src/lib/prisma.ts`, `src/lib/format.ts`.
Tables/cards/forms/modals: Referral landing card and status messaging.
Styling method: Tailwind.
Mobile layout notes: Single-card layout.
Risk level when editing: Medium.
Safe redesign notes: Keep invalid/disabled states clear.
Files to send to external UI/UX AI: `src/app/referral/[code]/page.tsx`.

## Component Map

Component: `BusinessForm`
File: `src/components/BusinessForm.tsx`
Used by: `/platform/businesses/new`, `/platform/businesses/[id]/edit`.
Purpose: System Administrator business create/edit wizard.
Risk level: High.
Global impact: Platform business onboarding and editing.
Safe editing notes: Preserve input names, plan selection, owner/branch/branding steps, and action prop.

Component: `CameraScanner`
File: `src/components/CameraScanner.tsx`
Used by: `/dashboard/scanner`, `/branch/scanner`, `/staff/scanner`.
Purpose: Camera QR scanner with manual token fallback.
Risk level: High.
Global impact: Business Owner, Branch Manager, and Staff scanner pages.
Safe editing notes: Keep `extractToken`, camera permission states, `jsQR` fallback, and redirect to `/scan/{token}`.

Component: `CardShareActions`
File: `src/components/CardShareActions.tsx`
Used by: `/card/[token]`, `/dashboard/customers`, `/dashboard/customers/[id]`, `/branch/customers`, `/branch/customers/[id]`, `/staff/customers/success`.
Purpose: Copy/share customer card and WhatsApp delivery controls.
Risk level: High.
Global impact: Customer card delivery across roles and public card.
Safe editing notes: Preserve invalid phone disabled state and audit action behavior.

Component: `ChangePasswordForm`
File: `src/components/ChangePasswordForm.tsx`
Used by: `/change-password`.
Purpose: Forced password change form.
Risk level: High.
Global impact: Account security flow.
Safe editing notes: Preserve CSRF hidden input and password validation UX.

Component: `CopyButton`
File: `src/components/CopyButton.tsx`
Used by: engagement detail, message detail, Customer 360 scan URLs.
Purpose: Client-side clipboard copy button.
Risk level: Medium.
Global impact: Several copy/link flows.
Safe editing notes: Keep fallback-safe copy behavior.

Component: `CsrfInput`
File: `src/components/CsrfInput.tsx`
Used by: Multiple mutation forms including dashboard and scan forms.
Purpose: Hidden CSRF field.
Risk level: High.
Global impact: Security for server actions.
Safe editing notes: Do not remove or rename `scope`.

Component: `DashboardShell`
File: `src/components/DashboardShell.tsx`
Used by: Most authenticated Platform, Business Owner, Branch Manager, and Staff pages.
Purpose: Shared authenticated layout, sidebar, header, welcome card, idle timeout.
Risk level: High.
Global impact: Global authenticated UX.
Safe editing notes: Preserve role-specific navigation, logo role routing, demo banner, cache/auth behavior, and `hideWelcomeMessage`.

Component: `ForgotPasswordForm`
File: `src/components/ForgotPasswordForm.tsx`
Used by: `/forgot-password`.
Purpose: Reset request form.
Risk level: High.
Global impact: Password reset UX.
Safe editing notes: Keep generic messaging and CSRF field.

Component: `IdempotencyInput`
File: `src/components/IdempotencyInput.tsx`
Used by: Stamp/reward mutation forms.
Purpose: Hidden idempotency key input.
Risk level: High.
Global impact: Duplicate transaction prevention.
Safe editing notes: Do not remove from transactional forms.

Component: `IdleSessionTimeout`
File: `src/components/IdleSessionTimeout.tsx`
Used by: `DashboardShell`.
Purpose: Auto logout after inactivity.
Risk level: High.
Global impact: All authenticated pages.
Safe editing notes: Preserve 15-minute idle behavior unless security policy changes.

Component: `InvoiceBadge`
File: `src/components/InvoiceBadge.tsx`
Used by: `/platform/invoices`, `/platform/invoices/[id]`, `/dashboard/billing`.
Purpose: Invoice status badge.
Risk level: Medium.
Global impact: Billing status UI.
Safe editing notes: Preserve supported invoice statuses.

Component: `LoginForm`
File: `src/components/LoginForm.tsx`
Used by: `/login`.
Purpose: Login form with password visibility and forgot-password link.
Risk level: High.
Global impact: Authentication.
Safe editing notes: Preserve CSRF and `loginAction`.

Component: `PlanBillingCycleFields`
File: `src/components/PlanBillingCycleFields.tsx`
Used by: `BusinessForm`.
Purpose: Plan-aware billing cycle fields.
Risk level: High.
Global impact: Business creation/edit subscription setup.
Safe editing notes: Keep Multi Branch yearly-only rule.

Component: `PlatformCards`
File: `src/components/PlatformCards.tsx`
Used by: `/platform`.
Purpose: System Administrator management module cards.
Risk level: Medium.
Global impact: Platform dashboard navigation.
Safe editing notes: Safe visual redesign if links remain.

Component: `ProgramForm`
File: `src/components/ProgramForm.tsx`
Used by: `/dashboard/programs/new`, `/dashboard/programs/[id]/edit`.
Purpose: Loyalty program create/edit form.
Risk level: High.
Global impact: Program setup.
Safe editing notes: Preserve required stamps, reward fields, active status, and hidden IDs.

Component: `ReferralShareActions`
File: `src/components/ReferralShareActions.tsx`
Used by: `/card/[token]`.
Purpose: Public referral link copy/share controls.
Risk level: Medium.
Global impact: Customer referral sharing.
Safe editing notes: Preserve referral URL use only.

Component: `ResetPasswordForm`
File: `src/components/ResetPasswordForm.tsx`
Used by: `/reset-password`.
Purpose: Password reset completion form.
Risk level: High.
Global impact: Password reset security.
Safe editing notes: Keep hidden token and CSRF fields.

Component: `SearchableCombobox`
File: `src/components/SearchableCombobox.tsx`
Used by: Platform filters/forms, program customer selectors, engagement/alert filters, staff/branch selectors.
Purpose: Accessible searchable selector for large datasets.
Risk level: High.
Global impact: Many high-volume admin/business selectors.
Safe editing notes: Preserve keyboard navigation, clear selection, hidden input, empty/loading states.

Component: `StaffPasswordResetAction`
File: `src/components/StaffPasswordResetAction.tsx`
Used by: `/dashboard/staff`.
Purpose: Business Owner staff/branch-manager password reset modal/action.
Risk level: High.
Global impact: Staff account security.
Safe editing notes: Preserve one-time temporary password display and CSRF.

Component: `StatusBadge`
File: `src/components/StatusBadge.tsx`
Used by: Many platform/business/customer/staff pages.
Purpose: Shared status badge for records/subscriptions/customer statuses.
Risk level: High.
Global impact: Status display across the app.
Safe editing notes: Keep supported enum labels.

## Detailed Section Map For Important Pages

### Public Homepage

Section name: Public header
Where defined: `src/app/page.tsx`
Component or local function: `PublicHeader`
Can external AI redesign safely? Yes.
Notes: Keep `/login`, mailto demo/pilot CTA, and anchor links.

Section name: Hero
Where defined: `src/app/page.tsx`
Component or local function: `HeroSection`, `LoyaltyCardPreview`
Can external AI redesign safely? Yes.
Notes: Pure frontend; no auth/data dependencies.

Section name: Trust / credibility
Where defined: `src/app/page.tsx`
Component or local function: `TrustSection`, `TrustMetric`
Can external AI redesign safely? Yes.
Notes: Static marketing content.

Section name: Features
Where defined: `src/app/page.tsx`
Component or local function: `FeaturesSection`, `FeatureCard`
Can external AI redesign safely? Yes.
Notes: Static `features` array.

Section name: How it works
Where defined: `src/app/page.tsx`
Component or local function: `HowItWorksSection`
Can external AI redesign safely? Yes.
Notes: Static `steps` array.

Section name: Pricing teaser
Where defined: `src/app/page.tsx`
Component or local function: `PricingTeaserSection`
Can external AI redesign safely? Yes.
Notes: Static pricing copy; should match final three-plan model.

Section name: FAQ
Where defined: `src/app/page.tsx`
Component or local function: `FaqSection`
Can external AI redesign safely? Yes.
Notes: Static `faqs` array.

Section name: Footer
Where defined: `src/app/page.tsx`
Component or local function: `Footer`
Can external AI redesign safely? Yes.
Notes: Keep login/demo links.

### Login Page

Section name: Login shell card
Where defined: `src/app/login/page.tsx`
Component or local function: Page JSX.
Can external AI redesign safely? Yes, with care.
Notes: Keep `createCsrfToken("login")`.

Section name: Login form
Where defined: `src/components/LoginForm.tsx`
Component or local function: `LoginForm`
Can external AI redesign safely? Yes, with care.
Notes: Keep `loginAction`, password eye, CSRF hidden input, and forgot-password link.

### System Administrator Dashboard

Section name: Platform health card
Where defined: `src/app/platform/page.tsx`
Component or local function: `PlatformHealthCard`
Can external AI redesign safely? Yes.
Notes: Header aside; includes environment, database, demo mode, failed logins, app version, system status.

Section name: KPI header
Where defined: `src/app/platform/page.tsx`
Component or local function: `KpiCard`
Can external AI redesign safely? Yes.
Notes: Keep revenue zero-state and alert link.

Section name: Quick actions
Where defined: `src/app/platform/page.tsx`
Component or local function: `QuickAction`
Can external AI redesign safely? Yes.
Notes: Keep links to new business, invoice, plans, users.

Section name: Management modules
Where defined: `src/app/platform/page.tsx`
Component or local function: `PlatformCards`
Can external AI redesign safely? Yes.
Notes: Currently only Businesses, Analytics, Settings.

Section name: Recent activity
Where defined: `src/app/platform/page.tsx`
Component or local function: Inline section with `SeverityBadge`.
Can external AI redesign safely? Yes.
Notes: Keep activity/date filters.

### Business Owner Dashboard

Section name: Header summary
Where defined: `src/app/dashboard/page.tsx`
Component or local function: `HeaderSummary`, `SummaryTile`
Can external AI redesign safely? Yes, with care.
Notes: Business name, plan, subscription, customers, programs, branches, alerts.

Section name: Main actions
Where defined: `src/app/dashboard/page.tsx`
Component or local function: `MainActions`
Can external AI redesign safely? Yes.
Notes: Keep Add Customer, Open Scanner, Redeem Reward, View Customers.

Section name: Today's performance
Where defined: `src/app/dashboard/page.tsx`
Component or local function: `TodayPerformance`, `MetricCard`
Can external AI redesign safely? Yes.
Notes: Do not change calculations.

Section name: Recent activity
Where defined: `src/app/dashboard/page.tsx`
Component or local function: `RecentActivity`
Can external AI redesign safely? Yes.
Notes: Links to related customers.

Section name: Recent customers
Where defined: `src/app/dashboard/page.tsx`
Component or local function: `RecentCustomers`
Can external AI redesign safely? Yes.
Notes: Keep status badge and customer links.

Section name: Program performance
Where defined: `src/app/dashboard/page.tsx`
Component or local function: `ProgramPerformance`
Can external AI redesign safely? Yes.
Notes: Keep progress metrics read-only.

### Customer 360 Page

Section name: Compact customer header
Where defined: `src/app/dashboard/customers/[id]/page.tsx`
Component or local function: `CustomerHeader`
Can external AI redesign safely? Yes, with care.
Notes: Keep Edit, Back, status, consent, tier badge.

Section name: KPI summary
Where defined: `src/app/dashboard/customers/[id]/page.tsx`
Component or local function: `KpiSummary`, `InsightMetric`, `RiskMetric`
Can external AI redesign safely? Yes.
Notes: Avoid duplicating metrics in overview.

Section name: Overview
Where defined: `src/app/dashboard/customers/[id]/page.tsx`
Component or local function: `OverviewPanel`
Can external AI redesign safely? Yes.
Notes: Public card, active progress, latest activity preview.

Section name: Tabs
Where defined: `src/app/dashboard/customers/[id]/page.tsx`
Component or local function: Inline tab navigation and `resolveCustomerTab`.
Can external AI redesign safely? Yes, with care.
Notes: Keep query param tab behavior.

Section name: Loyalty programs
Where defined: `src/app/dashboard/customers/[id]/page.tsx`
Component or local function: `LoyaltyProgramsPanel`
Can external AI redesign safely? Yes, with care.
Notes: Contains scan URL copy and scan token toggle forms.

Section name: Timeline/activity
Where defined: `src/app/dashboard/customers/[id]/page.tsx`
Component or local function: `TimelineRow`, `groupTimeline`
Can external AI redesign safely? Yes.
Notes: Keep chronology and links.

### Customers Page

Section name: Header/filter
Where defined: `src/app/dashboard/customers/page.tsx`
Component or local function: Inline form.
Can external AI redesign safely? Yes.
Notes: Search by customer data stays here, not dashboard.

Section name: Mobile customer cards
Where defined: `src/app/dashboard/customers/page.tsx`
Component or local function: Inline cards using `CardShareActions`.
Can external AI redesign safely? Yes.
Notes: Keep View/Edit/WhatsApp/card actions.

Section name: Desktop customer table
Where defined: `src/app/dashboard/customers/page.tsx`
Component or local function: Inline table.
Can external AI redesign safely? Yes.
Notes: Preserve action links and status badges.

### Programs Page

Section name: Header/KPIs
Where defined: `src/app/dashboard/programs/page.tsx`
Component or local function: `KpiCard`
Can external AI redesign safely? Yes.
Notes: Active, Reward Ready, Inactive.

Section name: Filters
Where defined: `src/app/dashboard/programs/page.tsx`
Component or local function: Inline form.
Can external AI redesign safely? Yes.
Notes: Native selects currently used.

Section name: Mobile cards
Where defined: `src/app/dashboard/programs/page.tsx`
Component or local function: Inline cards.
Can external AI redesign safely? Yes.
Notes: Keep View/Edit/Customers links.

Section name: Desktop table
Where defined: `src/app/dashboard/programs/page.tsx`
Component or local function: Inline table.
Can external AI redesign safely? Yes.
Notes: Keep status display and actions.

### Referrals Page

Section name: Referral performance
Where defined: `src/app/dashboard/referrals/page.tsx`
Component or local function: `Kpi`
Can external AI redesign safely? Yes.
Notes: KPI links filter by status/reward.

Section name: Referral list
Where defined: `src/app/dashboard/referrals/page.tsx`
Component or local function: `ReferralCard`
Can external AI redesign safely? Yes.
Notes: Keep referrer/referred customer links.

Section name: Top referrers
Where defined: `src/app/dashboard/referrals/page.tsx`
Component or local function: Inline aside.
Can external AI redesign safely? Yes.
Notes: Keep customer links.

Section name: How referrals qualify
Where defined: `src/app/dashboard/referrals/page.tsx`
Component or local function: `<details>` block.
Can external AI redesign safely? Yes.
Notes: Static explanation.

### Staff Page

Section name: Create staff form
Where defined: `src/app/dashboard/staff/page.tsx`
Component or local function: Inline form with `SearchableCombobox`.
Can external AI redesign safely? Yes, with care.
Notes: Preserve role/branch fields.

Section name: Staff table
Where defined: `src/app/dashboard/staff/page.tsx`
Component or local function: Inline table.
Can external AI redesign safely? Yes.
Notes: Contains `StaffPasswordResetAction`.

### Branches Page

Section name: Create branch form
Where defined: `src/app/dashboard/branches/page.tsx`
Component or local function: Inline form.
Can external AI redesign safely? Yes, with care.
Notes: Preserve branch limit checks and action fields.

Section name: Branch list
Where defined: `src/app/dashboard/branches/page.tsx`
Component or local function: Inline cards.
Can external AI redesign safely? Yes.
Notes: Keep status badges.

### Scanner Page

Section name: Business scanner shell
Where defined: `src/app/dashboard/scanner/page.tsx`
Component or local function: Shell wrapper.
Can external AI redesign safely? Yes.
Notes: Keep `CameraScanner backHref="/dashboard"`.

Section name: Branch scanner shell
Where defined: `src/app/branch/scanner/page.tsx`
Component or local function: Shell wrapper.
Can external AI redesign safely? Yes.
Notes: Keep `CameraScanner backHref="/branch"`.

Section name: Staff scanner shell
Where defined: `src/app/staff/scanner/page.tsx`
Component or local function: Shell wrapper.
Can external AI redesign safely? Yes.
Notes: Keep `CameraScanner backHref="/staff"`.

Section name: Camera scanner
Where defined: `src/components/CameraScanner.tsx`
Component or local function: `CameraScanner`
Can external AI redesign safely? Yes, with care.
Notes: Do not remove manual token fallback, camera permission handling, or token extraction.

### Public Customer Card

Section name: Card header/business branding
Where defined: `src/app/card/[token]/page.tsx`
Component or local function: Main page JSX.
Can external AI redesign safely? Yes.
Notes: Uses branding colors.

Section name: Customer tier
Where defined: `src/app/card/[token]/page.tsx`
Component or local function: `TierBadgePanel`
Can external AI redesign safely? Yes.
Notes: Shows badge/name only after simplification.

Section name: Primary reward/progress/QR
Where defined: `src/app/card/[token]/page.tsx`
Component or local function: `PrimaryRewardPanel`
Can external AI redesign safely? Yes, with care.
Notes: Keep QR readable and reward-ready state clear.

Section name: Save your card
Where defined: `src/app/card/[token]/page.tsx`
Component or local function: `CardShareActions`
Can external AI redesign safely? Yes.
Notes: WhatsApp/share/copy only, no real provider sending.

Section name: Referral
Where defined: `src/app/card/[token]/page.tsx`
Component or local function: `ReferralShareActions`
Can external AI redesign safely? Yes.
Notes: Only shown when referral URL exists.

Section name: Card details
Where defined: `src/app/card/[token]/page.tsx`
Component or local function: `Info`
Can external AI redesign safely? Yes.
Notes: Secondary technical details.

### Scan Token Page

Section name: Validation banner
Where defined: `src/app/scan/[token]/page.tsx`
Component or local function: Inline status banners.
Can external AI redesign safely? Yes, with care.
Notes: Keep top placement.

Section name: Stamp issuance
Where defined: `src/app/scan/[token]/page.tsx`
Component or local function: Inline form using `src/app/scan/actions.ts`.
Can external AI redesign safely? Yes, with care.
Notes: Keep quantity/reason/idempotency/CSRF fields.

Section name: Customer summary/details
Where defined: `src/app/scan/[token]/page.tsx`
Component or local function: Inline cards and `Info`.
Can external AI redesign safely? Yes.
Notes: Display-only.

Section name: Reward redemption
Where defined: `src/app/scan/[token]/page.tsx`
Component or local function: Inline redemption form.
Can external AI redesign safely? Yes, with care.
Notes: Keep permissions and action fields.

## Mapping Issues Found

- The previous map was removed and rebuilt because it could contain stale references from earlier phases.
- `src/app/page.tsx` is now verified as the public homepage, not the Business Owner dashboard.
- Business Owner dashboard is verified at `src/app/dashboard/page.tsx`.
- No `src/app/dashboard/layout.tsx`, `src/app/platform/layout.tsx`, `src/app/branch/layout.tsx`, or `src/app/staff/layout.tsx` files were found; authenticated pages use `DashboardShell` directly.
- `/dashboard/scanner`, `/branch/scanner`, and `/staff/scanner` are duplicate scanner shells by role, all sharing `CameraScanner`.
- `/dashboard/notifications` and `/dashboard/notifications/[id]` both exist; the list page includes investigation workspace behavior while the detail page remains available.
- `StatusBadge` exists as a shared component, but several pages also define local badge components named `StatusBadge` or `StatusPill`; this is a naming/consistency risk.
- `src/app/dashboard/customers/[id]/page.tsx` is a very large inline page with many local sections; high risk for accidental regressions.
- `src/app/card/[token]/page.tsx` is a large inline public card page; high risk for public UX/QR regressions.
- Some pages still use native `<select>` controls for small filters; large dynamic selectors use `SearchableCombobox`.
- No invented routes were included. Routes such as `/businesses`, `/users`, `/settings`, `/reports`, and `/referrals` without their real prefixes were not found as standalone app routes.

## Recommended Files To Send To External AI

Homepage redesign:
- `src/app/page.tsx`
- `src/app/globals.css`

Business Owner dashboard redesign:
- `src/app/dashboard/page.tsx`
- `src/components/DashboardShell.tsx`
- `src/components/StatusBadge.tsx`
- `src/lib/business-owner.ts`
- `src/lib/business-display.ts`
- `src/lib/format.ts`

Customer 360 redesign:
- `src/app/dashboard/customers/[id]/page.tsx`
- `src/components/DashboardShell.tsx`
- `src/components/CardShareActions.tsx`
- `src/components/CopyButton.tsx`
- `src/components/StatusBadge.tsx`
- `src/lib/customer-cards.ts`
- `src/lib/customer-tiers.ts`
- `src/lib/referrals.ts`
- `src/lib/format.ts`

Public customer card redesign:
- `src/app/card/[token]/page.tsx`
- `src/components/CardShareActions.tsx`
- `src/components/ReferralShareActions.tsx`
- `src/app/card-share-actions.ts`
- `src/lib/customer-cards.ts`
- `src/lib/customer-tiers.ts`
- `src/lib/programs.ts`
- `src/lib/referrals.ts`

Scanner redesign:
- `src/components/CameraScanner.tsx`
- `src/app/dashboard/scanner/page.tsx`
- `src/app/branch/scanner/page.tsx`
- `src/app/staff/scanner/page.tsx`
- `src/app/scan/[token]/page.tsx`
- `src/app/scan/actions.ts`
- `src/lib/scan.ts`

Global navigation redesign:
- `src/components/DashboardShell.tsx`
- `src/components/IdleSessionTimeout.tsx`
- `src/lib/roles.ts`
- `src/lib/session.ts`
- `src/app/layout.tsx`

Platform dashboard redesign:
- `src/app/platform/page.tsx`
- `src/components/DashboardShell.tsx`
- `src/components/PlatformCards.tsx`
- `src/lib/platform-settings.ts`
- `src/lib/format.ts`

Customers page redesign:
- `src/app/dashboard/customers/page.tsx`
- `src/components/CardShareActions.tsx`
- `src/components/StatusBadge.tsx`
- `src/lib/customer-cards.ts`
- `src/lib/customer-tiers.ts`
- `src/lib/phone.ts`

Programs page redesign:
- `src/app/dashboard/programs/page.tsx`
- `src/components/ProgramForm.tsx`
- `src/app/dashboard/programs/actions.ts`
- `src/lib/programs.ts`

Staff page redesign:
- `src/app/dashboard/staff/page.tsx`
- `src/components/StaffPasswordResetAction.tsx`
- `src/components/SearchableCombobox.tsx`
- `src/components/StatusBadge.tsx`

## Verification Checklist

- Project tree scanned: Yes.
- `src/app` scanned: Yes.
- `src/components` scanned: Yes.
- `src/lib` scanned: Yes.
- `prisma` scanned: Yes.
- `tests` scanned: Yes.
- All routes verified from existing `page.tsx`, `route.ts`, or `layout.tsx` files: Yes.
- No guessed folders: Yes.
- No invented paths: Yes.
- All recommended files exist: Yes.
- All high-impact components marked: Yes.
- Old incorrect mappings removed: Yes.

## Counts

- Real page routes documented: 66.
- Route handlers documented: 3.
- Root layouts documented: 1.
- Shared components documented: 20.
