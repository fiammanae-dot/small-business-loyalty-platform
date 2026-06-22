# LoyaltyBase UI/UX File Map

Generated from real project files on 2026-06-21. This file intentionally lists only files and routes that exist in the repository.

## Verified Project Structure

### src/app
Files found: 98

- src/app/api/session/idle-logout/route.ts
- src/app/benefits/page.tsx
- src/app/branch/customers/actions.ts
- src/app/branch/customers/new/page.tsx
- src/app/branch/customers/page.tsx
- src/app/branch/customers/[id]/page.tsx
- src/app/branch/page.tsx
- src/app/branch/programs/actions.ts
- src/app/branch/programs/page.tsx
- src/app/branch/programs/[id]/customers/page.tsx
- src/app/branch/programs/[id]/page.tsx
- src/app/branch/scanner/actions.ts
- src/app/branch/scanner/page.tsx
- src/app/card/[token]/page.tsx
- src/app/card-share-actions.ts
- src/app/change-password/actions.ts
- src/app/change-password/page.tsx
- src/app/dashboard/actions.ts
- src/app/dashboard/activity/page.tsx
- src/app/dashboard/activity/[id]/page.tsx
- src/app/dashboard/billing/page.tsx
- src/app/dashboard/branches/page.tsx
- src/app/dashboard/customers/new/page.tsx
- src/app/dashboard/customers/page.tsx
- src/app/dashboard/customers/[id]/edit/page.tsx
- src/app/dashboard/customers/[id]/page.tsx
- src/app/dashboard/engagement/page.tsx
- src/app/dashboard/engagement/[id]/page.tsx
- src/app/dashboard/exports/[type]/route.ts
- src/app/dashboard/messages/actions.ts
- src/app/dashboard/messages/page.tsx
- src/app/dashboard/messages/[id]/page.tsx
- src/app/dashboard/notifications/actions.ts
- src/app/dashboard/notifications/page.tsx
- src/app/dashboard/notifications/[id]/page.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/profile/page.tsx
- src/app/dashboard/programs/actions.ts
- src/app/dashboard/programs/new/page.tsx
- src/app/dashboard/programs/page.tsx
- src/app/dashboard/programs/[id]/customers/page.tsx
- src/app/dashboard/programs/[id]/edit/page.tsx
- src/app/dashboard/programs/[id]/page.tsx
- src/app/dashboard/referrals/page.tsx
- src/app/dashboard/referrals/[id]/page.tsx
- src/app/dashboard/scanner/page.tsx
- src/app/dashboard/settings/page.tsx
- src/app/dashboard/staff/page.tsx
- src/app/dashboard/staff/[id]/page.tsx
- src/app/favicon.ico
- src/app/forgot-password/actions.ts
- src/app/forgot-password/page.tsx
- src/app/globals.css
- src/app/layout.tsx
- src/app/login/actions.ts
- src/app/login/page.tsx
- src/app/logout/route.ts
- src/app/page.tsx
- src/app/platform/audit-center/export/route.ts
- src/app/platform/audit-center/page.tsx
- src/app/platform/billing-center/export/route.ts
- src/app/platform/billing-center/page.tsx
- src/app/platform/businesses/actions.ts
- src/app/platform/businesses/new/page.tsx
- src/app/platform/businesses/page.tsx
- src/app/platform/businesses/[id]/edit/page.tsx
- src/app/platform/businesses/[id]/page.tsx
- src/app/platform/database/page.tsx
- src/app/platform/health-analytics/export/route.ts
- src/app/platform/health-analytics/page.tsx
- src/app/platform/invoices/actions.ts
- src/app/platform/invoices/page.tsx
- src/app/platform/invoices/[id]/page.tsx
- src/app/platform/launch-readiness/page.tsx
- src/app/platform/page.tsx
- src/app/platform/plans/page.tsx
- src/app/platform/settings/actions.ts
- src/app/platform/settings/page.tsx
- src/app/platform/subscriptions/actions.ts
- src/app/platform/subscriptions/page.tsx
- src/app/platform/tenant-center/export/route.ts
- src/app/platform/tenant-center/page.tsx
- src/app/platform/users/page.tsx
- src/app/referral/[code]/page.tsx
- src/app/request-demo/page.tsx
- src/app/reset-password/actions.ts
- src/app/reset-password/page.tsx
- src/app/scan/actions.ts
- src/app/scan/[token]/page.tsx
- src/app/staff/customers/actions.ts
- src/app/staff/customers/new/page.tsx
- src/app/staff/customers/page.tsx
- src/app/staff/customers/success/page.tsx
- src/app/staff/customers/[id]/page.tsx
- src/app/staff/page.tsx
- src/app/staff/programs/page.tsx
- src/app/staff/scanner/actions.ts
- src/app/staff/scanner/page.tsx

### src/components
Files found: 32

- src/components/AppToaster.tsx
- src/components/BranchLocationFields.tsx
- src/components/BusinessBrandingProvider.tsx
- src/components/BusinessForm.tsx
- src/components/CameraScanner.tsx
- src/components/CardShareActions.tsx
- src/components/ChangePasswordForm.tsx
- src/components/ConfirmSubmitButton.tsx
- src/components/CopyButton.tsx
- src/components/CsrfInput.tsx
- src/components/DashboardShell.tsx
- src/components/DemoRequestForm.tsx
- src/components/ForgotPasswordForm.tsx
- src/components/HomepageMotion.tsx
- src/components/IdempotencyInput.tsx
- src/components/IdleSessionTimeout.tsx
- src/components/InvoiceBadge.tsx
- src/components/LoginForm.tsx
- src/components/MobileAccordionSection.tsx
- src/components/MobileFilterDrawer.tsx
- src/components/MobileTabSelector.tsx
- src/components/PlanBillingCycleFields.tsx
- src/components/PlatformCards.tsx
- src/components/PlatformKpiGrid.tsx
- src/components/ProgramForm.tsx
- src/components/ReferralShareActions.tsx
- src/components/ResetPasswordForm.tsx
- src/components/RoleNavigation.tsx
- src/components/ScannerSoundFeedback.tsx
- src/components/SearchableCombobox.tsx
- src/components/StaffPasswordResetAction.tsx
- src/components/StatusBadge.tsx

### src/lib
Files found: 41

- src/lib/alert-engine.ts
- src/lib/alert-investigation.ts
- src/lib/alert-labels.ts
- src/lib/app-url.ts
- src/lib/audit.ts
- src/lib/billing.ts
- src/lib/business-branding.ts
- src/lib/business-display.ts
- src/lib/business-owner.ts
- src/lib/commercial-access.ts
- src/lib/cooldowns.ts
- src/lib/csrf.ts
- src/lib/csv.ts
- src/lib/customer-cards.ts
- src/lib/customer-notifications.ts
- src/lib/customer-tiers.ts
- src/lib/customers.ts
- src/lib/database-health.ts
- src/lib/dev-auth.ts
- src/lib/engagement.ts
- src/lib/export-files.ts
- src/lib/format.ts
- src/lib/login-protection.ts
- src/lib/messages.ts
- src/lib/password-reset-email.ts
- src/lib/password-reset.ts
- src/lib/phone.ts
- src/lib/platform-options.ts
- src/lib/platform-settings.ts
- src/lib/prisma.ts
- src/lib/programs.ts
- src/lib/referrals.ts
- src/lib/request-info.ts
- src/lib/rewards.ts
- src/lib/roles.ts
- src/lib/scan.ts
- src/lib/secrets.ts
- src/lib/seed-data.ts
- src/lib/session.ts
- src/lib/subscription-plans.ts
- src/lib/subscriptions.ts

### prisma
Files found: 35

- prisma/migrations/0001_init/migration.sql
- prisma/migrations/0002_customer_foundation/migration.sql
- prisma/migrations/0003_customer_card_foundation/migration.sql
- prisma/migrations/0004_session_invalidation/migration.sql
- prisma/migrations/0005_loyalty_program_engine/migration.sql
- prisma/migrations/0006_qr_scanner_foundation/migration.sql
- prisma/migrations/0007_performance_indexes/migration.sql
- prisma/migrations/0008_phase_7a_subscription_lifecycle/migration.sql
- prisma/migrations/0008_stamp_issuance_engine/migration.sql
- prisma/migrations/0009_phase_7b_manual_billing/migration.sql
- prisma/migrations/0009_stamp_transaction_immutability/migration.sql
- prisma/migrations/0010_phase_7c_reward_redemptions/migration.sql
- prisma/migrations/0011_reward_redemption_immutability/migration.sql
- prisma/migrations/0012_launch_hardening_phase_1/migration.sql
- prisma/migrations/0013_database_rules_tenant_isolation/migration.sql
- prisma/migrations/0014_phase_7d_engagement_engine/migration.sql
- prisma/migrations/0015_phase_7e_message_delivery_preparation/migration.sql
- prisma/migrations/0016_phase_7f_operational_readiness/migration.sql
- prisma/migrations/0017_phase_11_referrals/migration.sql
- prisma/migrations/0018_phase_12a_audit_cooldowns/migration.sql
- prisma/migrations/0019_phase_12b_alert_engine_hardening/migration.sql
- prisma/migrations/0020_phase_12b_high_reward_policy/migration.sql
- prisma/migrations/0021_customer_tier_system/migration.sql
- prisma/migrations/0022_staff_password_reset_security/migration.sql
- prisma/migrations/0023_subscription_plan_single_source/migration.sql
- prisma/migrations/0024_visit_based_customer_tiers/migration.sql
- prisma/migrations/0025_customer_notifications_foundation/migration.sql
- prisma/migrations/0026_password_reset_tokens/migration.sql
- prisma/migrations/0027_business_specific_referral_codes/migration.sql
- prisma/migrations/0028_scanner_sound_settings/migration.sql
- prisma/schema.prisma
- prisma/seed-demo.js
- prisma/seed-manual-audit.js
- prisma/seed-pilot.js
- prisma/seed.js

### tests
Files found: 40

- tests/auth-navigation.test.mjs
- tests/business-dashboard-hero.test.mjs
- tests/customer-notifications.test.mjs
- tests/customer-tiers.test.mjs
- tests/database-rules.test.mjs
- tests/demo-mode-hardening.test.mjs
- tests/engagement-engine.test.mjs
- tests/high-risk-confirmations.test.mjs
- tests/launch-hardening.test.mjs
- tests/loyalty-regression.test.mjs
- tests/manual-audit-seed.test.mjs
- tests/message-delivery.test.mjs
- tests/multi-program-scanner.test.mjs
- tests/password-reset.test.mjs
- tests/phase-11-referrals.test.mjs
- tests/phase-12a-audit-cooldowns.test.mjs
- tests/phase-12b-alert-engine.test.mjs
- tests/phase-13g-scalability-ux.test.mjs
- tests/phase-8-scanner.test.mjs
- tests/phone-normalization.test.mjs
- tests/pilot-seed-cleanliness.test.mjs
- tests/platform-analytics-upgrade.test.mjs
- tests/platform-audit-center.test.mjs
- tests/platform-billing-center.test.mjs
- tests/platform-businesses-filters.test.mjs
- tests/platform-dashboard-ui.test.mjs
- tests/platform-exports.test.mjs
- tests/platform-plans-ui.test.mjs
- tests/platform-settings-environment.test.mjs
- tests/platform-subscriptions-ui.test.mjs
- tests/platform-tenant-center.test.mjs
- tests/platform-users-filters.test.mjs
- tests/platform-ux-hardening.test.mjs
- tests/route-permissions.test.mjs
- tests/session-idle-timeout.test.mjs
- tests/staff-password-reset.test.mjs
- tests/subscription-plan-single-source.test.mjs
- tests/tenant-isolation.test.mjs
- tests/ux-readiness.test.mjs
- tests/whatsapp-card-delivery.test.mjs

## Verified Routes

### /

Route: /

Main file: src/app/page.tsx

Purpose: Public marketing homepage

Role access: Public/auth flow

Imported components: Link, "next/link";, ArrowRight, BarChart3, CircleHelp, Gift, MessageSquare, QrCode, ScanLine, ShieldCheck, Sparkles, Users, "lucide-react";, LucideIcon, MotionItem, MotionOnScroll, MotionReveal, MotionStagger

Local sections/functions: HomePage, PublicHeader, HeroSection, LoyaltyCardPreview, TrustSection, FeaturesSection, HowItWorksSection, PricingTeaserSection, FaqSection, Footer, SectionHeading, TrustMetric, FeatureCard

Connected actions: None detected

Connected lib/data files: None detected

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/page.tsx

### /api/session/idle-logout

Route: /api/session/idle-logout

Main file: src/app/api/session/idle-logout/route.ts

Purpose: Workspace page

Role access: Public/auth flow

Imported components: None detected

Local sections/functions: POST

Connected actions: None detected

Connected lib/data files: @/lib/session

Tables/cards/forms/modals: basic JSX layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: Low

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/api/session/idle-logout/route.ts

### /benefits

Route: /benefits

Main file: src/app/benefits/page.tsx

Purpose: Workspace page

Role access: Public/auth flow

Imported components: None detected

Local sections/functions: BenefitsPage, PublicHeader, Footer

Connected actions: None detected

Connected lib/data files: None detected

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/benefits/page.tsx

### /branch

Route: /branch

Main file: src/app/branch/page.tsx

Purpose: Branch workflow

Role access: Branch Manager

Imported components: Link, "next/link";, Bell, Gift, QrCode, Search, TicketCheck, UserCheck, Users, "lucide-react";, LucideIcon, DashboardShell

Local sections/functions: BranchDashboard, ActivityRow, StaffStat, Action, Metric, Info

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/page.tsx, src/components/DashboardShell.tsx

### /branch/customers

Route: /branch/customers

Main file: src/app/branch/customers/page.tsx

Purpose: Customer workflow

Role access: Branch Manager

Imported components: Link, "next/link";, CardShareActions, DashboardShell, StatusBadge

Local sections/functions: BranchCustomersPage, Message

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/customers, @/lib/format, @/lib/phone, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/customers/page.tsx, src/components/CardShareActions.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /branch/customers/[id]

Route: /branch/customers/[id]

Main file: src/app/branch/customers/[id]/page.tsx

Purpose: Customer workflow

Role access: Branch Manager

Imported components: Link, "next/link";, Image, "next/image";, React, "react";, CardShareActions, DashboardShell, StatusBadge

Local sections/functions: BranchCustomerProfilePage, Info

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/customers, @/lib/format, @/lib/phone, @/lib/prisma, @/lib/programs, @/lib/scan, @/lib/session

Tables/cards/forms/modals: tables, cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/customers/[id]/page.tsx, src/components/CardShareActions.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /branch/customers/new

Route: /branch/customers/new

Main file: src/app/branch/customers/new/page.tsx

Purpose: Customer workflow

Role access: Branch Manager

Imported components: Link, "next/link";, CsrfInput, DashboardShell

Local sections/functions: NewBranchCustomerPage, Input

Connected actions: @/app/branch/customers/actions

Connected lib/data files: @/lib/session

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: Medium

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/customers/new/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /branch/programs

Route: /branch/programs

Main file: src/app/branch/programs/page.tsx

Purpose: Loyalty program workflow

Role access: Branch Manager

Imported components: Link, "next/link";, Gift, TicketCheck, Trophy, Users, "lucide-react";, LucideIcon, DashboardShell

Local sections/functions: BranchProgramsPage, ProgramStat

Connected actions: None detected

Connected lib/data files: @/lib/prisma, @/lib/programs, @/lib/session

Tables/cards/forms/modals: cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/programs/page.tsx, src/components/DashboardShell.tsx

### /branch/programs/[id]

Route: /branch/programs/[id]

Main file: src/app/branch/programs/[id]/page.tsx

Purpose: Loyalty program workflow

Role access: Branch Manager

Imported components: Link, "next/link";, Gift, TicketCheck, Trophy, Users, "lucide-react";, LucideIcon, DashboardShell

Local sections/functions: BranchProgramDetailPage, PerformanceStat, Info

Connected actions: None detected

Connected lib/data files: @/lib/prisma, @/lib/programs, @/lib/roles, @/lib/session

Tables/cards/forms/modals: cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/programs/[id]/page.tsx, src/components/DashboardShell.tsx

### /branch/programs/[id]/customers

Route: /branch/programs/[id]/customers

Main file: src/app/branch/programs/[id]/customers/page.tsx

Purpose: Customer workflow

Role access: Branch Manager

Imported components: Link, "next/link";, CsrfInput, DashboardShell, SearchableCombobox

Local sections/functions: BranchProgramCustomersPage

Connected actions: @/app/branch/programs/actions

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/programs, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/programs/[id]/customers/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/SearchableCombobox.tsx

### /branch/scanner

Route: /branch/scanner

Main file: src/app/branch/scanner/page.tsx

Purpose: Scanner and QR validation

Role access: Branch Manager

Imported components: CameraScanner, DashboardShell

Local sections/functions: BranchScannerPage

Connected actions: None detected

Connected lib/data files: @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/branch/scanner/page.tsx, src/components/CameraScanner.tsx, src/components/DashboardShell.tsx

### /card/[token]

Route: /card/[token]

Main file: src/app/card/[token]/page.tsx

Purpose: Public customer loyalty card

Role access: Public/auth flow

Imported components: CardShareActions, ReferralShareActions

Local sections/functions: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/customer-tiers, @/lib/format, @/lib/prisma, @/lib/programs, @/lib/scan, @/lib/referrals

Tables/cards/forms/modals: cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids; bottom navigation/safe area

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/card/[token]/page.tsx, src/components/CardShareActions.tsx, src/components/ReferralShareActions.tsx

### /change-password

Route: /change-password

Main file: src/app/change-password/page.tsx

Purpose: Workspace page

Role access: Public/auth flow

Imported components: Link, "next/link";, "next/navigation";, ChangePasswordForm

Local sections/functions: ChangePasswordPage

Connected actions: None detected

Connected lib/data files: @/lib/csrf, @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/change-password/page.tsx, src/components/ChangePasswordForm.tsx

### /dashboard

Route: /dashboard

Main file: src/app/dashboard/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, React, "react";, CheckCircle2, Gift, Search, ScanLine, ShieldAlert, TicketCheck, UserPlus, Users, "lucide-react";, LucideIcon, DashboardShell, StatusBadge

Local sections/functions: BusinessDashboard, HeaderSummary, SecondaryBusinessMetric, CompactCustomerSearch, MainActions, RecentCustomers, ProgramPerformance, RecentActivity, ActivityMetric, OnboardingSummary, SummaryTile, PrimaryAction, SectionCard, EmptyState

Connected actions: None detected

Connected lib/data files: @/lib/business-display, @/lib/business-owner, @/lib/format, @/lib/prisma, @/lib/roles

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/page.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /dashboard/activity

Route: /dashboard/activity

Main file: src/app/dashboard/activity/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, Gift, History, Share2, TicketCheck, Users, "lucide-react";, LucideIcon, DashboardShell

Local sections/functions: BusinessActivityPage, ActivityMetric, ActivityRow

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/activity/page.tsx, src/components/DashboardShell.tsx

### /dashboard/activity/[id]

Route: /dashboard/activity/[id]

Main file: src/app/dashboard/activity/[id]/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, "next/navigation";, DashboardShell

Local sections/functions: ActivityDetailPage, Info

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/alert-investigation, @/lib/format, @/lib/prisma, @/lib/programs, @/lib/roles

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/activity/[id]/page.tsx, src/components/DashboardShell.tsx

### /dashboard/billing

Route: /dashboard/billing

Main file: src/app/dashboard/billing/page.tsx

Purpose: Billing/subscription workflow

Role access: Business Owner

Imported components: DashboardShell, InvoiceBadge

Local sections/functions: BusinessBillingPage, BillingMetric

Connected actions: None detected

Connected lib/data files: @/lib/billing, @/lib/business-owner, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/billing/page.tsx, src/components/DashboardShell.tsx, src/components/InvoiceBadge.tsx

### /dashboard/branches

Route: /dashboard/branches

Main file: src/app/dashboard/branches/page.tsx

Purpose: Branch workflow

Role access: Business Owner

Imported components: ConfirmSubmitButton, DashboardShell, CsrfInput, StatusBadge

Local sections/functions: BranchesPage, BranchForm, Input, Message

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/platform-options

Tables/cards/forms/modals: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/branches/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/DashboardShell.tsx, src/components/CsrfInput.tsx, src/components/StatusBadge.tsx

### /dashboard/customers

Route: /dashboard/customers

Main file: src/app/dashboard/customers/page.tsx

Purpose: Customer workflow

Role access: Business Owner

Imported components: Link, "next/link";, CardShareActions, DashboardShell, StatusBadge

Local sections/functions: CustomersPage, Select, Message

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/business-owner, @/lib/customers, @/lib/format, @/lib/phone, @/lib/prisma

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/customers/page.tsx, src/components/CardShareActions.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /dashboard/customers/[id]

Route: /dashboard/customers/[id]

Main file: src/app/dashboard/customers/[id]/page.tsx

Purpose: Customer workflow

Role access: Business Owner

Imported components: Link, "next/link";, Image, "next/image";, React, "react";, CalendarDays, CreditCard, Crown, Gift, History, ShieldAlert, Sparkles, TicketCheck, UserRound, Users, "lucide-react";, LucideIcon, DashboardShell, CardShareActions, ConfirmSubmitButton, CopyButton, CsrfInput, StatusBadge

Local sections/functions: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner, @/lib/alert-investigation, @/lib/alert-labels, @/lib/customer-cards, @/lib/customer-tiers, @/lib/customers, @/lib/format, @/lib/phone, @/lib/prisma, @/lib/programs, @/lib/scan

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/customers/[id]/page.tsx, src/components/DashboardShell.tsx, src/components/CardShareActions.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CopyButton.tsx, src/components/CsrfInput.tsx, src/components/StatusBadge.tsx

### /dashboard/customers/[id]/edit

Route: /dashboard/customers/[id]/edit

Main file: src/app/dashboard/customers/[id]/edit/page.tsx

Purpose: Customer workflow

Role access: Business Owner

Imported components: Link, "next/link";, CsrfInput, DashboardShell

Local sections/functions: EditCustomerPage, Input

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner, @/lib/customers, @/lib/phone

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/customers/[id]/edit/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /dashboard/customers/new

Route: /dashboard/customers/new

Main file: src/app/dashboard/customers/new/page.tsx

Purpose: Customer workflow

Role access: Business Owner

Imported components: Link, "next/link";, CsrfInput, DashboardShell, SearchableCombobox

Local sections/functions: NewCustomerPage, Input

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/customers/new/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/SearchableCombobox.tsx

### /dashboard/engagement

Route: /dashboard/engagement

Main file: src/app/dashboard/engagement/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, EngagementEventType, "@prisma/client";, DashboardShell, SearchableCombobox

Local sections/functions: EngagementCenterPage, Metric

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/engagement, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/engagement/page.tsx, src/components/DashboardShell.tsx, src/components/SearchableCombobox.tsx

### /dashboard/engagement/[id]

Route: /dashboard/engagement/[id]

Main file: src/app/dashboard/engagement/[id]/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, "next/navigation";, React, "react";, CopyButton, CsrfInput, DashboardShell

Local sections/functions: EngagementEventDetailPage, PrepareButton, Info

Connected actions: @/app/dashboard/messages/actions

Connected lib/data files: @/lib/business-owner, @/lib/engagement, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/engagement/[id]/page.tsx, src/components/CopyButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /dashboard/exports/[type]

Route: /dashboard/exports/[type]

Main file: src/app/dashboard/exports/[type]/route.ts

Purpose: Workspace page

Role access: Business Owner

Imported components: None detected

Local sections/functions: GET

Connected actions: None detected

Connected lib/data files: @/lib/alert-labels, @/lib/csv, @/lib/format, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: inputs/filters

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/exports/[type]/route.ts

### /dashboard/messages

Route: /dashboard/messages

Main file: src/app/dashboard/messages/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, ReactNode, "react";, CheckCircle2, MessageSquare, Search, XCircle, "lucide-react";, DashboardShell

Local sections/functions: MessageOutboxPage, MessageKpi, StatusBadge, EmptyMessages

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/engagement, @/lib/format, @/lib/messages, @/lib/prisma

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/messages/page.tsx, src/components/DashboardShell.tsx

### /dashboard/messages/[id]

Route: /dashboard/messages/[id]

Main file: src/app/dashboard/messages/[id]/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, "next/navigation";, React, "react";, CopyButton, CsrfInput, DashboardShell

Local sections/functions: MessageDetailPage, MessageActionForm, Info

Connected actions: @/app/dashboard/messages/actions

Connected lib/data files: @/lib/business-owner, @/lib/engagement, @/lib/format, @/lib/messages, @/lib/prisma

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/messages/[id]/page.tsx, src/components/CopyButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /dashboard/notifications

Route: /dashboard/notifications

Main file: src/app/dashboard/notifications/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, ActivityAlertSeverity, ActivityAlertStatus, Prisma, "@prisma/client";, ReactNode, "react";, BarChart3, Bell, ChevronDown, Clock, Search, ShieldAlert, UserCheck, "lucide-react";, CsrfInput, DashboardShell, SearchableCombobox

Local sections/functions: NotificationsPage, AlertCard, AlertActionsDropdown, ActionForm, CompactInfo, RiskMeter, InvestigationPanel, TimelineItem, InvestigationLink, SeverityBadge, FilterSummary, MiniChart

Connected actions: @/app/dashboard/notifications/actions

Connected lib/data files: @/lib/alert-engine, @/lib/business-owner, @/lib/alert-investigation, @/lib/alert-labels, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/notifications/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/SearchableCombobox.tsx

### /dashboard/notifications/[id]

Route: /dashboard/notifications/[id]

Main file: src/app/dashboard/notifications/[id]/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: Link, "next/link";, "next/navigation";, React, "react";, CsrfInput, DashboardShell

Local sections/functions: NotificationDetailPage, ActionLink, Info

Connected actions: @/app/dashboard/notifications/actions

Connected lib/data files: @/lib/business-owner, @/lib/alert-investigation, @/lib/alert-labels, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/notifications/[id]/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /dashboard/profile

Route: /dashboard/profile

Main file: src/app/dashboard/profile/page.tsx

Purpose: Workspace page

Role access: Business Owner

Imported components: DashboardShell, CsrfInput, StatusBadge

Local sections/functions: BusinessProfilePage, Message, ReadOnly

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/platform-options, @/lib/roles

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/profile/page.tsx, src/components/DashboardShell.tsx, src/components/CsrfInput.tsx, src/components/StatusBadge.tsx

### /dashboard/programs

Route: /dashboard/programs

Main file: src/app/dashboard/programs/page.tsx

Purpose: Loyalty program workflow

Role access: Business Owner

Imported components: Link, "next/link";, ReactNode, "react";, Gift, Search, Trophy, Users, "lucide-react";, DashboardShell

Local sections/functions: ProgramsPage, KpiCard, StatusBadge, EmptyPrograms

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/programs, @/lib/roles, @/lib/prisma

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/programs/page.tsx, src/components/DashboardShell.tsx

### /dashboard/programs/[id]

Route: /dashboard/programs/[id]

Main file: src/app/dashboard/programs/[id]/page.tsx

Purpose: Loyalty program workflow

Role access: Business Owner

Imported components: Link, "next/link";, ConfirmSubmitButton, CsrfInput, DashboardShell

Local sections/functions: ProgramDetailPage, NotFound, Info, Metric, CompletionMetric

Connected actions: @/app/dashboard/programs/actions

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/programs, @/lib/roles, @/lib/prisma

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/programs/[id]/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /dashboard/programs/[id]/customers

Route: /dashboard/programs/[id]/customers

Main file: src/app/dashboard/programs/[id]/customers/page.tsx

Purpose: Customer workflow

Role access: Business Owner

Imported components: Link, "next/link";, CsrfInput, DashboardShell, SearchableCombobox

Local sections/functions: ProgramCustomersPage, ProgramMembersTable

Connected actions: @/app/dashboard/programs/actions

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/programs, @/lib/prisma

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/programs/[id]/customers/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/SearchableCombobox.tsx

### /dashboard/programs/[id]/edit

Route: /dashboard/programs/[id]/edit

Main file: src/app/dashboard/programs/[id]/edit/page.tsx

Purpose: Loyalty program workflow

Role access: Business Owner

Imported components: DashboardShell, ProgramForm

Local sections/functions: EditProgramPage

Connected actions: @/app/dashboard/programs/actions

Connected lib/data files: @/lib/business-owner, @/lib/prisma

Tables/cards/forms/modals: forms/actions, cards/KPIs

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/programs/[id]/edit/page.tsx, src/components/DashboardShell.tsx, src/components/ProgramForm.tsx

### /dashboard/programs/new

Route: /dashboard/programs/new

Main file: src/app/dashboard/programs/new/page.tsx

Purpose: Loyalty program workflow

Role access: Business Owner

Imported components: DashboardShell, ProgramForm

Local sections/functions: NewProgramPage

Connected actions: @/app/dashboard/programs/actions

Connected lib/data files: @/lib/business-owner

Tables/cards/forms/modals: forms/actions, cards/KPIs

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: Medium

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/programs/new/page.tsx, src/components/DashboardShell.tsx, src/components/ProgramForm.tsx

### /dashboard/referrals

Route: /dashboard/referrals

Main file: src/app/dashboard/referrals/page.tsx

Purpose: Referral workflow

Role access: Business Owner

Imported components: Link, "next/link";, Prisma, ReferralRewardStatus, ReferralStatus, "@prisma/client";, Gift, Search, Share2, Sparkles, Trophy, Users, "lucide-react";, LucideIcon, DashboardShell

Local sections/functions: ReferralsPage, ReferralCard, Kpi, StatusPill

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/referrals/page.tsx, src/components/DashboardShell.tsx

### /dashboard/referrals/[id]

Route: /dashboard/referrals/[id]

Main file: src/app/dashboard/referrals/[id]/page.tsx

Purpose: Referral workflow

Role access: Business Owner

Imported components: Link, "next/link";, "next/navigation";, ArrowLeft, Gift, History, Share2, Stamp, Users, "lucide-react";, LucideIcon, Prisma, "@prisma/client";, DashboardShell

Local sections/functions: ReferralDetailPage, CustomerPanel, Info, StatusPill

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/format, @/lib/prisma

Tables/cards/forms/modals: cards/KPIs, confirmations/modals/drawers, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/referrals/[id]/page.tsx, src/components/DashboardShell.tsx

### /dashboard/scanner

Route: /dashboard/scanner

Main file: src/app/dashboard/scanner/page.tsx

Purpose: Scanner and QR validation

Role access: Business Owner

Imported components: CameraScanner, DashboardShell

Local sections/functions: BusinessOwnerScannerPage

Connected actions: None detected

Connected lib/data files: @/lib/session

Tables/cards/forms/modals: basic JSX layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/scanner/page.tsx, src/components/CameraScanner.tsx, src/components/DashboardShell.tsx

### /dashboard/settings

Route: /dashboard/settings

Main file: src/app/dashboard/settings/page.tsx

Purpose: Settings/configuration

Role access: Business Owner

Imported components: ConfirmSubmitButton, CsrfInput, DashboardShell, StatusBadge

Local sections/functions: BusinessSettingsPage, Input, Item

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner, @/lib/customer-tiers, @/lib/format, @/lib/prisma, @/lib/roles, @/lib/subscriptions, @/lib/messages

Tables/cards/forms/modals: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/settings/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /dashboard/staff

Route: /dashboard/staff

Main file: src/app/dashboard/staff/page.tsx

Purpose: User/staff management

Role access: Business Owner

Imported components: ConfirmSubmitButton, DashboardShell, Link, "next/link";, CsrfInput, SearchableCombobox, StaffPasswordResetAction, StatusBadge

Local sections/functions: StaffUsersPage, StaffCreateForm, Input, Message

Connected actions: @/app/dashboard/actions

Connected lib/data files: @/lib/business-owner, @/lib/csrf, @/lib/format, @/lib/prisma, @/lib/roles

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/staff/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/DashboardShell.tsx, src/components/CsrfInput.tsx, src/components/SearchableCombobox.tsx, src/components/StaffPasswordResetAction.tsx, src/components/StatusBadge.tsx

### /dashboard/staff/[id]

Route: /dashboard/staff/[id]

Main file: src/app/dashboard/staff/[id]/page.tsx

Purpose: User/staff management

Role access: Business Owner

Imported components: Link, "next/link";, "next/navigation";, React, "react";, DashboardShell, StatusBadge

Local sections/functions: StaffDetailPage, Info

Connected actions: None detected

Connected lib/data files: @/lib/business-owner, @/lib/alert-investigation, @/lib/alert-labels, @/lib/format, @/lib/prisma, @/lib/roles

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/dashboard/staff/[id]/page.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /forgot-password

Route: /forgot-password

Main file: src/app/forgot-password/page.tsx

Purpose: Password reset/authentication

Role access: Public/auth flow

Imported components: Link, "next/link";, ForgotPasswordForm

Local sections/functions: ForgotPasswordPage

Connected actions: None detected

Connected lib/data files: @/lib/csrf, @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/forgot-password/page.tsx, src/components/ForgotPasswordForm.tsx

### /login

Route: /login

Main file: src/app/login/page.tsx

Purpose: Login/authentication

Role access: Public/auth flow

Imported components: Link, "next/link";, CheckCircle2, ShieldCheck, Sparkles, "lucide-react";, LoginForm

Local sections/functions: LoginPage, LoginBenefit

Connected actions: None detected

Connected lib/data files: @/lib/csrf, @/lib/session

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/login/page.tsx, src/components/LoginForm.tsx

### /logout

Route: /logout

Main file: src/app/logout/route.ts

Purpose: Workspace page

Role access: Public/auth flow

Imported components: None detected

Local sections/functions: POST

Connected actions: None detected

Connected lib/data files: @/lib/csrf, @/lib/session

Tables/cards/forms/modals: basic JSX layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: Medium

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/logout/route.ts

### /platform

Route: /platform

Main file: src/app/platform/page.tsx

Purpose: Workspace page

Role access: System Administrator

Imported components: Link, "next/link";, BarChart3, Building2, CreditCard, Package, Plus, Receipt, Settings, ShieldAlert, UserPlus, Users, "lucide-react";, LucideIcon, DashboardShell, PlatformKpiGrid, PlatformCards

Local sections/functions: PlatformDashboard, KpiCard, QuickAction, SeverityBadge

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/page.tsx, src/components/DashboardShell.tsx, src/components/PlatformKpiGrid.tsx, src/components/PlatformCards.tsx

### /platform/audit-center

Route: /platform/audit-center

Main file: src/app/platform/audit-center/page.tsx

Purpose: Audit/security review

Role access: System Administrator

Imported components: Link, "next/link";, ReactNode, "react";, Prisma, "@prisma/client";, Activity, AlertTriangle, Ban, Building2, CalendarClock, CheckCircle2, ClipboardList, Download, FileSpreadsheet, FileText, Filter, KeyRound, Search, ShieldAlert, UserCog, XCircle, "lucide-react";, LucideIcon, DashboardShell, MobileFilterDrawer, PlatformKpiGrid, SearchableCombobox

Local sections/functions: PlatformAuditCenterPage, KpiLink, Select, SeverityBadge, StatusBadge, AuditEventMobileCard, MobileAuditDetail, AuditDetailsDrawer, Detail, MetadataBlock, ExportButton, SecurityMetric, SummaryTable, SummaryMobileCard, HealthMetric

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/roles, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/audit-center/page.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/PlatformKpiGrid.tsx, src/components/SearchableCombobox.tsx

### /platform/audit-center/export

Route: /platform/audit-center/export

Main file: src/app/platform/audit-center/export/route.ts

Purpose: Audit/security review

Role access: System Administrator

Imported components: None detected

Local sections/functions: GET

Connected actions: None detected

Connected lib/data files: @/lib/export-files, @/lib/format, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: inputs/filters

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/audit-center/export/route.ts

### /platform/billing-center

Route: /platform/billing-center

Main file: src/app/platform/billing-center/page.tsx

Purpose: Billing/subscription workflow

Role access: System Administrator

Imported components: Link, "next/link";, ReactNode, "react";, Prisma, "@prisma/client";, AlertTriangle, CalendarClock, CircleDollarSign, CreditCard, Download, FileSpreadsheet, FileText, Filter, Receipt, TrendingDown, TrendingUp, "lucide-react";, LucideIcon, DashboardShell, MobileAccordionSection, MobileFilterDrawer, PlatformKpiGrid, SearchableCombobox

Local sections/functions: PlatformBillingCenterPage, BillingCenterTabs, AdvancedSubscriptionTable, SubscriptionMobileCard, RenewalCenter, TrialManagement, PlanPerformance, InvoiceStatusDashboard, InvoiceTable, InvoiceMobileCard, BillingMobileLine, PaymentTracking, ChurnAnalytics, BillingAlerts, KpiCard, Panel, MiniMetric, HealthLine, Chart, Distribution, LifecycleBadge, ActionLink, BillingActionRow, MetricLine, EmptyText, ExportButton

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/billing, @/lib/prisma, @/lib/session, @/lib/subscription-plans, @/lib/subscriptions

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/billing-center/page.tsx, src/components/DashboardShell.tsx, src/components/MobileAccordionSection.tsx, src/components/MobileFilterDrawer.tsx, src/components/PlatformKpiGrid.tsx, src/components/SearchableCombobox.tsx

### /platform/billing-center/export

Route: /platform/billing-center/export

Main file: src/app/platform/billing-center/export/route.ts

Purpose: Billing/subscription workflow

Role access: System Administrator

Imported components: None detected

Local sections/functions: GET

Connected actions: None detected

Connected lib/data files: @/lib/export-files, @/lib/billing, @/lib/format, @/lib/prisma, @/lib/session, @/lib/subscription-plans, @/lib/subscriptions

Tables/cards/forms/modals: cards/KPIs, inputs/filters

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/billing-center/export/route.ts

### /platform/businesses

Route: /platform/businesses

Main file: src/app/platform/businesses/page.tsx

Purpose: Tenant/business management

Role access: System Administrator

Imported components: BusinessType, Prisma, RecordStatus, "@prisma/client";, Eye, MoreHorizontal, Pencil, Plus, Power, Search, SlidersHorizontal, X, "lucide-react";, Link, "next/link";, ReactNode, "react";, ConfirmSubmitButton, CsrfInput, DashboardShell, MobileFilterDrawer, SearchableCombobox, StatusBadge

Local sections/functions: BusinessesPage, SelectField, InputField, QuickChip, BusinessSummaryCard, BusinessRow, BusinessMobileCard, BusinessActions, Detail, SuspiciousBadge

Connected actions: @/app/platform/businesses/actions

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/businesses/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/SearchableCombobox.tsx, src/components/StatusBadge.tsx

### /platform/businesses/[id]

Route: /platform/businesses/[id]

Main file: src/app/platform/businesses/[id]/page.tsx

Purpose: Tenant/business management

Role access: System Administrator

Imported components: Link, "next/link";, "next/navigation";, ConfirmSubmitButton, CsrfInput, DashboardShell, StatusBadge

Local sections/functions: BusinessDetailPage, InfoMetric, InfoCard, InfoRow, ColorRow, MobileDetail

Connected actions: @/app/platform/businesses/actions

Connected lib/data files: @/lib/format, @/lib/billing, @/lib/subscription-plans, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/businesses/[id]/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /platform/businesses/[id]/edit

Route: /platform/businesses/[id]/edit

Main file: src/app/platform/businesses/[id]/edit/page.tsx

Purpose: Tenant/business management

Role access: System Administrator

Imported components: Link, "next/link";, "next/navigation";, BusinessForm, DashboardShell

Local sections/functions: EditBusinessPage

Connected actions: @/app/platform/businesses/actions

Connected lib/data files: @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, inputs/filters

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/businesses/[id]/edit/page.tsx, src/components/BusinessForm.tsx, src/components/DashboardShell.tsx

### /platform/businesses/new

Route: /platform/businesses/new

Main file: src/app/platform/businesses/new/page.tsx

Purpose: Tenant/business management

Role access: System Administrator

Imported components: Link, "next/link";, BusinessForm, DashboardShell

Local sections/functions: NewBusinessPage

Connected actions: @/app/platform/businesses/actions

Connected lib/data files: @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, inputs/filters

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/businesses/new/page.tsx, src/components/BusinessForm.tsx, src/components/DashboardShell.tsx

### /platform/database

Route: /platform/database

Main file: src/app/platform/database/page.tsx

Purpose: Workspace page

Role access: System Administrator

Imported components: Link, "next/link";, DashboardShell, PlatformKpiGrid

Local sections/functions: DatabaseHealthPage, HealthTile

Connected actions: None detected

Connected lib/data files: @/lib/database-health, @/lib/session

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/database/page.tsx, src/components/DashboardShell.tsx, src/components/PlatformKpiGrid.tsx

### /platform/health-analytics

Route: /platform/health-analytics

Main file: src/app/platform/health-analytics/page.tsx

Purpose: Workspace page

Role access: System Administrator

Imported components: Link, "next/link";, ReactNode, "react";, BarChart3, Download, FileSpreadsheet, FileText, TrendingUp, "lucide-react";, DashboardShell, MobileAccordionSection, PlatformKpiGrid

Local sections/functions: PlatformHealthAnalyticsPage, RecentActivityCard, Section, MetricGrid, Metric, HealthMetric, ChartCard, DistributionCard, TopBusinessTable, ExportButton

Connected actions: None detected

Connected lib/data files: @/lib/database-health, @/lib/format, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: tables, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/health-analytics/page.tsx, src/components/DashboardShell.tsx, src/components/MobileAccordionSection.tsx, src/components/PlatformKpiGrid.tsx

### /platform/health-analytics/export

Route: /platform/health-analytics/export

Main file: src/app/platform/health-analytics/export/route.ts

Purpose: Workspace page

Role access: System Administrator

Imported components: None detected

Local sections/functions: GET

Connected actions: None detected

Connected lib/data files: @/lib/export-files, @/lib/database-health, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/health-analytics/export/route.ts

### /platform/invoices

Route: /platform/invoices

Main file: src/app/platform/invoices/page.tsx

Purpose: Billing/subscription workflow

Role access: System Administrator

Imported components: Link, "next/link";, InvoiceStatus, Prisma, "@prisma/client";, ConfirmSubmitButton, CsrfInput, DashboardShell, MobileFilterDrawer, InvoiceBadge, SearchableCombobox

Local sections/functions: PlatformInvoicesPage, InvoiceDesktopRows, InvoiceDetail, InvoiceKpi, InvoiceActions, InvoiceEmpty, StatusForm, Message

Connected actions: @/app/platform/invoices/actions

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/session, @/lib/billing

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/invoices/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/InvoiceBadge.tsx, src/components/SearchableCombobox.tsx

### /platform/invoices/[id]

Route: /platform/invoices/[id]

Main file: src/app/platform/invoices/[id]/page.tsx

Purpose: Billing/subscription workflow

Role access: System Administrator

Imported components: Link, "next/link";, "next/navigation";, InvoiceStatus, "@prisma/client";, ConfirmSubmitButton, CsrfInput, DashboardShell, InvoiceBadge

Local sections/functions: PlatformInvoiceDetailPage, StatusForm, Info, Input

Connected actions: @/app/platform/invoices/actions

Connected lib/data files: @/lib/billing, @/lib/format, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/invoices/[id]/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/InvoiceBadge.tsx

### /platform/launch-readiness

Route: /platform/launch-readiness

Main file: src/app/platform/launch-readiness/page.tsx

Purpose: Workspace page

Role access: System Administrator

Imported components: CheckCircle2, XCircle, "lucide-react";, DashboardShell

Local sections/functions: LaunchReadinessPage

Connected actions: None detected

Connected lib/data files: @/lib/prisma, @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/launch-readiness/page.tsx, src/components/DashboardShell.tsx

### /platform/plans

Route: /platform/plans

Main file: src/app/platform/plans/page.tsx

Purpose: Workspace page

Role access: System Administrator

Imported components: Link, "next/link";, ReactNode, "react";, CreditCard, GitBranch, Package, Search, Star, TrendingUp, "lucide-react";, DashboardShell, MobileFilterDrawer, PlatformKpiGrid

Local sections/functions: PlatformPlansPage, KpiCard, PlanCard, PlanAnalysisCard, PlanAnalysisRow, PlanStat, UtilizationBar

Connected actions: None detected

Connected lib/data files: @/lib/subscription-plans, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/plans/page.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/PlatformKpiGrid.tsx

### /platform/settings

Route: /platform/settings

Main file: src/app/platform/settings/page.tsx

Purpose: Settings/configuration

Role access: System Administrator

Imported components: Activity, Bell, Building2, CheckCircle2, Database, FlaskConical, GitBranch, HeartPulse, KeyRound, Link2Off, Lock, Mail, MessageSquareOff, PackageCheck, RadioTower, Receipt, Server, ShieldCheck, Smartphone, Users, "lucide-react";, LucideIcon, ActivityAlertStatus, "@prisma/client";, Link, "next/link";, "../../../../package.json";, CsrfInput, DashboardShell, MobileTabSelector

Local sections/functions: PlatformSettingsPage, GeneralTab, SecurityTab, NotificationsTab, DemoModeTab, AuditLogsTab, SectionHeader, InfoCard, MetricCard, RestrictionPanel, PlaceholderPanel, FutureCapabilitiesPanel, MobileDetailLine, AdminLink

Connected actions: @/app/platform/settings/actions

Connected lib/data files: @/lib/format, @/lib/platform-settings, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/settings/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/MobileTabSelector.tsx

### /platform/subscriptions

Route: /platform/subscriptions

Main file: src/app/platform/subscriptions/page.tsx

Purpose: Billing/subscription workflow

Role access: System Administrator

Imported components: Prisma, SubscriptionStatus, "@prisma/client";, ChevronDown, ExternalLink, RotateCcw, "lucide-react";, Link, "next/link";, ConfirmSubmitButton, CsrfInput, DashboardShell, MobileFilterDrawer, PlatformKpiGrid, SearchableCombobox, StatusBadge

Local sections/functions: PlatformSubscriptionsPage, SubscriptionKpiCard, SubscriptionRow, SubscriptionCard, SubscriptionActions, ActionButton, DetailRow, CompactBadge, Detail, Message

Connected actions: @/app/platform/subscriptions/actions

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/session, @/lib/subscription-plans, @/lib/subscriptions

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/subscriptions/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/PlatformKpiGrid.tsx, src/components/SearchableCombobox.tsx, src/components/StatusBadge.tsx

### /platform/tenant-center

Route: /platform/tenant-center

Main file: src/app/platform/tenant-center/page.tsx

Purpose: Tenant/business management

Role access: System Administrator

Imported components: Link, "next/link";, ReactNode, "react";, ActivityAlertStatus, Prisma, RecordStatus, SubscriptionStatus, "@prisma/client";, Activity, AlertTriangle, Building2, CheckCircle2, Download, FileSpreadsheet, FileText, Filter, Search, ShieldCheck, Users, "lucide-react";, LucideIcon, DashboardShell, MobileFilterDrawer, PlatformKpiGrid, SearchableCombobox

Local sections/functions: PlatformTenantCenterPage, TenantDirectory, KpiCard, Panel, HealthBadge, StatusBadge, SmallBadge, ActionLink, ExportButton, MetricLine, EmptyState

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/tenant-center/page.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/PlatformKpiGrid.tsx, src/components/SearchableCombobox.tsx

### /platform/tenant-center/export

Route: /platform/tenant-center/export

Main file: src/app/platform/tenant-center/export/route.ts

Purpose: Tenant/business management

Role access: System Administrator

Imported components: None detected

Local sections/functions: GET

Connected actions: None detected

Connected lib/data files: @/lib/export-files, @/lib/format, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: inputs/filters

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/tenant-center/export/route.ts

### /platform/users

Route: /platform/users

Main file: src/app/platform/users/page.tsx

Purpose: User/staff management

Role access: System Administrator

Imported components: Prisma, RecordStatus, UserRole, "@prisma/client";, RotateCcw, Search, SlidersHorizontal, "lucide-react";, Link, "next/link";, ReactNode, "react";, DashboardShell, MobileFilterDrawer, SearchableCombobox, StatusBadge

Local sections/functions: PlatformUsersPage, UserRow, UserMobileCard, SelectField, InputField, QuickChip, RoleBadge, SuspiciousBadge, Detail

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/roles, @/lib/session

Tables/cards/forms/modals: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: mobile-specific view; overflow/table handling; responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/platform/users/page.tsx, src/components/DashboardShell.tsx, src/components/MobileFilterDrawer.tsx, src/components/SearchableCombobox.tsx, src/components/StatusBadge.tsx

### /referral/[code]

Route: /referral/[code]

Main file: src/app/referral/[code]/page.tsx

Purpose: Referral workflow

Role access: Public/auth flow

Imported components: None detected

Local sections/functions: ReferralLandingPage, ReferralUnavailable

Connected actions: None detected

Connected lib/data files: @/lib/prisma, @/lib/roles, @/lib/referrals

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/referral/[code]/page.tsx

### /request-demo

Route: /request-demo

Main file: src/app/request-demo/page.tsx

Purpose: Workspace page

Role access: Public/auth flow

Imported components: Link, "next/link";, Building2, Clock3, MessageSquare, ShieldCheck, "lucide-react";, DemoRequestForm

Local sections/functions: RequestDemoPage, PublicHeader, Footer

Connected actions: None detected

Connected lib/data files: None detected

Tables/cards/forms/modals: cards/KPIs, confirmations/modals/drawers, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/request-demo/page.tsx, src/components/DemoRequestForm.tsx

### /reset-password

Route: /reset-password

Main file: src/app/reset-password/page.tsx

Purpose: Password reset/authentication

Role access: Public/auth flow

Imported components: Link, "next/link";, ResetPasswordForm

Local sections/functions: ResetPasswordPage

Connected actions: None detected

Connected lib/data files: @/lib/csrf, @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/reset-password/page.tsx, src/components/ResetPasswordForm.tsx

### /scan/[token]

Route: /scan/[token]

Main file: src/app/scan/[token]/page.tsx

Purpose: Scanner and QR validation

Role access: Public/auth flow

Imported components: Link, "next/link";, "next/navigation";, React, "react";, ConfirmSubmitButton, CsrfInput, DashboardShell, IdempotencyInput, ScannerSoundFeedback, StatusBadge

Local sections/functions: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Connected actions: @/app/scan/actions

Connected lib/data files: @/lib/commercial-access, @/lib/customer-cards, @/lib/format, @/lib/prisma, @/lib/programs, @/lib/rewards, @/lib/roles, @/lib/session

Tables/cards/forms/modals: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/scan/[token]/page.tsx, src/components/ConfirmSubmitButton.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx, src/components/IdempotencyInput.tsx, src/components/ScannerSoundFeedback.tsx, src/components/StatusBadge.tsx

### /staff

Route: /staff

Main file: src/app/staff/page.tsx

Purpose: User/staff management

Role access: Staff

Imported components: Link, "next/link";, Gift, QrCode, Search, TicketCheck, UserPlus, Users, "lucide-react";, LucideIcon, DashboardShell

Local sections/functions: StaffDashboard, Action, Metric, Info

Connected actions: None detected

Connected lib/data files: @/lib/format, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: cards/KPIs, confirmations/modals/drawers, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/page.tsx, src/components/DashboardShell.tsx

### /staff/customers

Route: /staff/customers

Main file: src/app/staff/customers/page.tsx

Purpose: Customer workflow

Role access: Staff

Imported components: Link, "next/link";, Search, "lucide-react";, DashboardShell, StatusBadge

Local sections/functions: StaffCustomerSearchPage

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/phone, @/lib/prisma, @/lib/programs, @/lib/session

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/customers/page.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /staff/customers/[id]

Route: /staff/customers/[id]

Main file: src/app/staff/customers/[id]/page.tsx

Purpose: Customer workflow

Role access: Staff

Imported components: Image, "next/image";, Link, "next/link";, React, "react";, QRCode, "qrcode";, DashboardShell, StatusBadge

Local sections/functions: StaffCustomerProfilePage, Info

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/phone, @/lib/prisma, @/lib/programs, @/lib/session

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/customers/[id]/page.tsx, src/components/DashboardShell.tsx, src/components/StatusBadge.tsx

### /staff/customers/new

Route: /staff/customers/new

Main file: src/app/staff/customers/new/page.tsx

Purpose: Customer workflow

Role access: Staff

Imported components: Link, "next/link";, CsrfInput, DashboardShell

Local sections/functions: NewStaffCustomerPage, Input

Connected actions: @/app/staff/customers/actions

Connected lib/data files: @/lib/session

Tables/cards/forms/modals: forms/actions, cards/KPIs, inputs/filters, responsive layout

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: responsive grids

Risk level when editing: Medium

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/customers/new/page.tsx, src/components/CsrfInput.tsx, src/components/DashboardShell.tsx

### /staff/customers/success

Route: /staff/customers/success

Main file: src/app/staff/customers/success/page.tsx

Purpose: Customer workflow

Role access: Staff

Imported components: Link, "next/link";, CardShareActions, DashboardShell

Local sections/functions: StaffCustomerSuccessPage

Connected actions: None detected

Connected lib/data files: @/lib/customer-cards, @/lib/prisma, @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components, business theme utilities.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/customers/success/page.tsx, src/components/CardShareActions.tsx, src/components/DashboardShell.tsx

### /staff/programs

Route: /staff/programs

Main file: src/app/staff/programs/page.tsx

Purpose: Loyalty program workflow

Role access: Staff

Imported components: DashboardShell

Local sections/functions: StaffProgramsPage

Connected actions: None detected

Connected lib/data files: @/lib/prisma, @/lib/programs, @/lib/session

Tables/cards/forms/modals: cards/KPIs, responsive layout

Styling method: Tailwind utilities/shared components.

Mobile layout notes: responsive grids

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/programs/page.tsx, src/components/DashboardShell.tsx

### /staff/scanner

Route: /staff/scanner

Main file: src/app/staff/scanner/page.tsx

Purpose: Scanner and QR validation

Role access: Staff

Imported components: CameraScanner, DashboardShell

Local sections/functions: StaffScannerPage

Connected actions: None detected

Connected lib/data files: @/lib/session

Tables/cards/forms/modals: cards/KPIs

Styling method: Tailwind utilities/shared components.

Mobile layout notes: No explicit mobile-only structure detected

Risk level when editing: High

Safe redesign notes: Preserve route params, auth helpers, Prisma filters, server actions, form names, CSRF/idempotency fields, and role-specific scoping.

Files to send to external UI/UX AI: src/app/staff/scanner/page.tsx, src/components/CameraScanner.tsx, src/components/DashboardShell.tsx

## Component Map

### AppToaster

Component: AppToaster

File: src/components/AppToaster.tsx

Used by: src/app/layout.tsx

Purpose: basic JSX layout

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### BranchLocationFields

Component: BranchLocationFields

File: src/components/BranchLocationFields.tsx

Used by: src/components/BusinessForm.tsx

Purpose: cards/KPIs, inputs/filters

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### BusinessBrandingProvider

Component: BusinessBrandingProvider

File: src/components/BusinessBrandingProvider.tsx

Used by: src/components/DashboardShell.tsx

Purpose: basic JSX layout

Risk level: Low

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### BusinessForm

Component: BusinessForm

File: src/components/BusinessForm.tsx

Used by: src/app/platform/businesses/[id]/edit/page.tsx, src/app/platform/businesses/new/page.tsx

Purpose: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout

Risk level: High

Global impact: Local/medium impact (2 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### CameraScanner

Component: CameraScanner

File: src/components/CameraScanner.tsx

Used by: src/app/branch/scanner/page.tsx, src/app/dashboard/scanner/page.tsx, src/app/staff/scanner/page.tsx

Purpose: cards/KPIs, inputs/filters, responsive layout

Risk level: High

Global impact: HIGH IMPACT (3 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### CardShareActions

Component: CardShareActions

File: src/components/CardShareActions.tsx

Used by: src/app/branch/customers/[id]/page.tsx, src/app/branch/customers/page.tsx, src/app/card/[token]/page.tsx, src/app/dashboard/customers/[id]/page.tsx, src/app/dashboard/customers/page.tsx, src/app/staff/customers/success/page.tsx

Purpose: cards/KPIs, responsive layout

Risk level: High

Global impact: HIGH IMPACT (6 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ChangePasswordForm

Component: ChangePasswordForm

File: src/components/ChangePasswordForm.tsx

Used by: src/app/change-password/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ConfirmSubmitButton

Component: ConfirmSubmitButton

File: src/components/ConfirmSubmitButton.tsx

Used by: src/app/dashboard/branches/page.tsx, src/app/dashboard/customers/[id]/page.tsx, src/app/dashboard/programs/[id]/page.tsx, src/app/dashboard/settings/page.tsx, src/app/dashboard/staff/page.tsx, src/app/platform/businesses/[id]/page.tsx, src/app/platform/businesses/page.tsx, src/app/platform/invoices/[id]/page.tsx, src/app/platform/invoices/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/scan/[token]/page.tsx

Purpose: cards/KPIs, confirmations/modals/drawers, responsive layout

Risk level: High

Global impact: HIGH IMPACT (11 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### CopyButton

Component: CopyButton

File: src/components/CopyButton.tsx

Used by: src/app/dashboard/customers/[id]/page.tsx, src/app/dashboard/engagement/[id]/page.tsx, src/app/dashboard/messages/[id]/page.tsx

Purpose: cards/KPIs

Risk level: Low

Global impact: HIGH IMPACT (3 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### CsrfInput

Component: CsrfInput

File: src/components/CsrfInput.tsx

Used by: src/app/branch/customers/new/page.tsx, src/app/branch/programs/[id]/customers/page.tsx, src/app/dashboard/branches/page.tsx, src/app/dashboard/customers/[id]/edit/page.tsx, src/app/dashboard/customers/[id]/page.tsx, src/app/dashboard/customers/new/page.tsx, src/app/dashboard/engagement/[id]/page.tsx, src/app/dashboard/messages/[id]/page.tsx, src/app/dashboard/notifications/[id]/page.tsx, src/app/dashboard/notifications/page.tsx, src/app/dashboard/profile/page.tsx, src/app/dashboard/programs/[id]/customers/page.tsx, src/app/dashboard/programs/[id]/page.tsx, src/app/dashboard/settings/page.tsx, src/app/dashboard/staff/page.tsx, src/app/platform/businesses/[id]/page.tsx, src/app/platform/businesses/page.tsx, src/app/platform/invoices/[id]/page.tsx, src/app/platform/invoices/page.tsx, src/app/platform/settings/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/scan/[token]/page.tsx, src/app/staff/customers/new/page.tsx, src/components/BusinessForm.tsx, src/components/DashboardShell.tsx, src/components/ProgramForm.tsx

Purpose: inputs/filters

Risk level: Low

Global impact: HIGH IMPACT (26 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### DashboardShell

Component: DashboardShell

File: src/components/DashboardShell.tsx

Used by: src/app/branch/customers/[id]/page.tsx, src/app/branch/customers/new/page.tsx, src/app/branch/customers/page.tsx, src/app/branch/page.tsx, src/app/branch/programs/[id]/customers/page.tsx, src/app/branch/programs/[id]/page.tsx, src/app/branch/programs/page.tsx, src/app/branch/scanner/page.tsx, src/app/dashboard/activity/[id]/page.tsx, src/app/dashboard/activity/page.tsx, src/app/dashboard/billing/page.tsx, src/app/dashboard/branches/page.tsx, src/app/dashboard/customers/[id]/edit/page.tsx, src/app/dashboard/customers/[id]/page.tsx, src/app/dashboard/customers/new/page.tsx, src/app/dashboard/customers/page.tsx, src/app/dashboard/engagement/[id]/page.tsx, src/app/dashboard/engagement/page.tsx, src/app/dashboard/messages/[id]/page.tsx, src/app/dashboard/messages/page.tsx, src/app/dashboard/notifications/[id]/page.tsx, src/app/dashboard/notifications/page.tsx, src/app/dashboard/page.tsx, src/app/dashboard/profile/page.tsx, src/app/dashboard/programs/[id]/customers/page.tsx, src/app/dashboard/programs/[id]/edit/page.tsx, src/app/dashboard/programs/[id]/page.tsx, src/app/dashboard/programs/new/page.tsx, src/app/dashboard/programs/page.tsx, src/app/dashboard/referrals/[id]/page.tsx, src/app/dashboard/referrals/page.tsx, src/app/dashboard/scanner/page.tsx, src/app/dashboard/settings/page.tsx, src/app/dashboard/staff/[id]/page.tsx, src/app/dashboard/staff/page.tsx, src/app/platform/audit-center/page.tsx, src/app/platform/billing-center/page.tsx, src/app/platform/businesses/[id]/edit/page.tsx, src/app/platform/businesses/[id]/page.tsx, src/app/platform/businesses/new/page.tsx, src/app/platform/businesses/page.tsx, src/app/platform/database/page.tsx, src/app/platform/health-analytics/page.tsx, src/app/platform/invoices/[id]/page.tsx, src/app/platform/invoices/page.tsx, src/app/platform/launch-readiness/page.tsx, src/app/platform/page.tsx, src/app/platform/plans/page.tsx, src/app/platform/settings/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/platform/tenant-center/page.tsx, src/app/platform/users/page.tsx, src/app/scan/[token]/page.tsx, src/app/staff/customers/[id]/page.tsx, src/app/staff/customers/new/page.tsx, src/app/staff/customers/page.tsx, src/app/staff/customers/success/page.tsx, src/app/staff/page.tsx, src/app/staff/programs/page.tsx, src/app/staff/scanner/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters, responsive layout

Risk level: High

Global impact: HIGH IMPACT (60 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### DemoRequestForm

Component: DemoRequestForm

File: src/components/DemoRequestForm.tsx

Used by: src/app/request-demo/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters, responsive layout

Risk level: Medium

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ForgotPasswordForm

Component: ForgotPasswordForm

File: src/components/ForgotPasswordForm.tsx

Used by: src/app/forgot-password/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### HomepageMotion

Component: HomepageMotion

File: src/components/HomepageMotion.tsx

Used by: src/app/page.tsx

Purpose: basic JSX layout

Risk level: Low

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### IdempotencyInput

Component: IdempotencyInput

File: src/components/IdempotencyInput.tsx

Used by: src/app/scan/[token]/page.tsx

Purpose: inputs/filters

Risk level: Low

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### IdleSessionTimeout

Component: IdleSessionTimeout

File: src/components/IdleSessionTimeout.tsx

Used by: src/components/DashboardShell.tsx

Purpose: basic JSX layout

Risk level: Low

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### InvoiceBadge

Component: InvoiceBadge

File: src/components/InvoiceBadge.tsx

Used by: src/app/dashboard/billing/page.tsx, src/app/platform/invoices/[id]/page.tsx, src/app/platform/invoices/page.tsx

Purpose: cards/KPIs

Risk level: High

Global impact: HIGH IMPACT (3 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### LoginForm

Component: LoginForm

File: src/components/LoginForm.tsx

Used by: src/app/login/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### MobileAccordionSection

Component: MobileAccordionSection

File: src/components/MobileAccordionSection.tsx

Used by: src/app/platform/billing-center/page.tsx, src/app/platform/health-analytics/page.tsx

Purpose: cards/KPIs, responsive layout

Risk level: Low

Global impact: Local/medium impact (2 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### MobileFilterDrawer

Component: MobileFilterDrawer

File: src/components/MobileFilterDrawer.tsx

Used by: src/app/platform/audit-center/page.tsx, src/app/platform/billing-center/page.tsx, src/app/platform/businesses/page.tsx, src/app/platform/invoices/page.tsx, src/app/platform/plans/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/platform/tenant-center/page.tsx, src/app/platform/users/page.tsx

Purpose: cards/KPIs, confirmations/modals/drawers, responsive layout

Risk level: Low

Global impact: HIGH IMPACT (8 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### MobileTabSelector

Component: MobileTabSelector

File: src/components/MobileTabSelector.tsx

Used by: src/app/platform/settings/page.tsx

Purpose: cards/KPIs, inputs/filters, responsive layout

Risk level: Low

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### PlanBillingCycleFields

Component: PlanBillingCycleFields

File: src/components/PlanBillingCycleFields.tsx

Used by: src/components/BusinessForm.tsx

Purpose: cards/KPIs, inputs/filters, responsive layout

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### PlatformCards

Component: PlatformCards

File: src/components/PlatformCards.tsx

Used by: src/app/platform/page.tsx

Purpose: cards/KPIs, responsive layout

Risk level: Medium

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### PlatformKpiGrid

Component: PlatformKpiGrid

File: src/components/PlatformKpiGrid.tsx

Used by: src/app/platform/audit-center/page.tsx, src/app/platform/billing-center/page.tsx, src/app/platform/database/page.tsx, src/app/platform/health-analytics/page.tsx, src/app/platform/page.tsx, src/app/platform/plans/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/platform/tenant-center/page.tsx

Purpose: cards/KPIs, responsive layout

Risk level: Medium

Global impact: HIGH IMPACT (8 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ProgramForm

Component: ProgramForm

File: src/components/ProgramForm.tsx

Used by: src/app/dashboard/programs/[id]/edit/page.tsx, src/app/dashboard/programs/new/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters, responsive layout

Risk level: High

Global impact: Local/medium impact (2 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ReferralShareActions

Component: ReferralShareActions

File: src/components/ReferralShareActions.tsx

Used by: src/app/card/[token]/page.tsx

Purpose: cards/KPIs, responsive layout

Risk level: Medium

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ResetPasswordForm

Component: ResetPasswordForm

File: src/components/ResetPasswordForm.tsx

Used by: src/app/reset-password/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### RoleNavigation

Component: RoleNavigation

File: src/components/RoleNavigation.tsx

Used by: src/components/DashboardShell.tsx

Purpose: cards/KPIs, responsive layout

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### ScannerSoundFeedback

Component: ScannerSoundFeedback

File: src/components/ScannerSoundFeedback.tsx

Used by: src/app/scan/[token]/page.tsx

Purpose: basic JSX layout

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### SearchableCombobox

Component: SearchableCombobox

File: src/components/SearchableCombobox.tsx

Used by: src/app/branch/programs/[id]/customers/page.tsx, src/app/dashboard/customers/new/page.tsx, src/app/dashboard/engagement/page.tsx, src/app/dashboard/notifications/page.tsx, src/app/dashboard/programs/[id]/customers/page.tsx, src/app/dashboard/staff/page.tsx, src/app/platform/audit-center/page.tsx, src/app/platform/billing-center/page.tsx, src/app/platform/businesses/page.tsx, src/app/platform/invoices/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/platform/tenant-center/page.tsx, src/app/platform/users/page.tsx, src/components/PlanBillingCycleFields.tsx

Purpose: cards/KPIs, inputs/filters

Risk level: High

Global impact: HIGH IMPACT (14 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### StaffPasswordResetAction

Component: StaffPasswordResetAction

File: src/components/StaffPasswordResetAction.tsx

Used by: src/app/dashboard/staff/page.tsx

Purpose: forms/actions, cards/KPIs, inputs/filters

Risk level: High

Global impact: Local/medium impact (1 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

### StatusBadge

Component: StatusBadge

File: src/components/StatusBadge.tsx

Used by: src/app/branch/customers/[id]/page.tsx, src/app/branch/customers/page.tsx, src/app/dashboard/branches/page.tsx, src/app/dashboard/customers/[id]/page.tsx, src/app/dashboard/customers/page.tsx, src/app/dashboard/messages/page.tsx, src/app/dashboard/page.tsx, src/app/dashboard/profile/page.tsx, src/app/dashboard/programs/page.tsx, src/app/dashboard/settings/page.tsx, src/app/dashboard/staff/[id]/page.tsx, src/app/dashboard/staff/page.tsx, src/app/platform/audit-center/page.tsx, src/app/platform/businesses/[id]/page.tsx, src/app/platform/businesses/page.tsx, src/app/platform/subscriptions/page.tsx, src/app/platform/tenant-center/page.tsx, src/app/platform/users/page.tsx, src/app/scan/[token]/page.tsx, src/app/staff/customers/[id]/page.tsx, src/app/staff/customers/page.tsx

Purpose: cards/KPIs

Risk level: High

Global impact: HIGH IMPACT (21 references detected)

Safe editing notes: Preserve props, client/server boundary, action behavior, ARIA labels, and exported names.

## Section Map for Important Pages

### Public homepage

Route: /

Main file: src/app/page.tsx

Section name: Turn occasional customers into loyal regulars.

Where defined: src/app/page.tsx

Component or local function: HomePage, PublicHeader, HeroSection, LoyaltyCardPreview, TrustSection, FeaturesSection, HowItWorksSection, PricingTeaserSection, FaqSection, Footer, SectionHeading, TrustMetric, FeatureCard

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; responsive grids.

Section name: Features

Where defined: src/app/page.tsx

Component or local function: HomePage, PublicHeader, HeroSection, LoyaltyCardPreview, TrustSection, FeaturesSection, HowItWorksSection, PricingTeaserSection, FaqSection, Footer, SectionHeading, TrustMetric, FeatureCard

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; responsive grids.

Section name: How it works

Where defined: src/app/page.tsx

Component or local function: HomePage, PublicHeader, HeroSection, LoyaltyCardPreview, TrustSection, FeaturesSection, HowItWorksSection, PricingTeaserSection, FaqSection, Footer, SectionHeading, TrustMetric, FeatureCard

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; responsive grids.

Section name: Start small, grow by branch.

Where defined: src/app/page.tsx

Component or local function: HomePage, PublicHeader, HeroSection, LoyaltyCardPreview, TrustSection, FeaturesSection, HowItWorksSection, PricingTeaserSection, FaqSection, Footer, SectionHeading, TrustMetric, FeatureCard

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; responsive grids.

Section name: FAQ

Where defined: src/app/page.tsx

Component or local function: HomePage, PublicHeader, HeroSection, LoyaltyCardPreview, TrustSection, FeaturesSection, HowItWorksSection, PricingTeaserSection, FaqSection, Footer, SectionHeading, TrustMetric, FeatureCard

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; responsive grids.

### Login page

Route: /login

Main file: src/app/login/page.tsx

Section name: Sign in to manage loyalty operations.

Where defined: src/app/login/page.tsx

Component or local function: LoginPage, LoginBenefit

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; mobile-specific view; responsive grids.

Section name: Welcome back

Where defined: src/app/login/page.tsx

Component or local function: LoginPage, LoginBenefit

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, responsive layout; mobile-specific view; responsive grids.

### System Administrator dashboard

Route: /platform

Main file: src/app/platform/page.tsx

Section name: Common platform tasks

Where defined: src/app/platform/page.tsx

Component or local function: PlatformDashboard, KpiCard, QuickAction, SeverityBadge

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, inputs/filters, responsive layout; responsive grids.

Section name: Primary operations

Where defined: src/app/platform/page.tsx

Component or local function: PlatformDashboard, KpiCard, QuickAction, SeverityBadge

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, inputs/filters, responsive layout; responsive grids.

Section name: Latest platform events

Where defined: src/app/platform/page.tsx

Component or local function: PlatformDashboard, KpiCard, QuickAction, SeverityBadge

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, inputs/filters, responsive layout; responsive grids.

### Business Owner dashboard

Route: /dashboard

Main file: src/app/dashboard/page.tsx

Section name: dynamic

Where defined: src/app/dashboard/page.tsx

Component or local function: BusinessDashboard, HeaderSummary, SecondaryBusinessMetric, CompactCustomerSearch, MainActions, RecentCustomers, ProgramPerformance, RecentActivity, ActivityMetric, OnboardingSummary, SummaryTile, PrimaryAction, SectionCard, EmptyState

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, inputs/filters, responsive layout; responsive grids.

Section name: Quick Actions

Where defined: src/app/dashboard/page.tsx

Component or local function: BusinessDashboard, HeaderSummary, SecondaryBusinessMetric, CompactCustomerSearch, MainActions, RecentCustomers, ProgramPerformance, RecentActivity, ActivityMetric, OnboardingSummary, SummaryTile, PrimaryAction, SectionCard, EmptyState

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, inputs/filters, responsive layout; responsive grids.

### Customer 360 page

Route: /dashboard/customers/[id]

Main file: src/app/dashboard/customers/[id]/page.tsx

Section name: dynamic

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Customer history

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Stamp issuance history

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Member details

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Programs

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Recent movement

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Customer grade

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Referral investigation

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Ready to redeem

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Public member card

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

Section name: Program progress

Where defined: src/app/dashboard/customers/[id]/page.tsx

Component or local function: CustomerProfilePage, KpiCard, TabLink, ProfileSummaryCard, LoyaltyOverviewPanel, LatestActivityPreview, TierDetailsPanel, ReferralSummaryPanel, RewardsPanel, CustomerCardPanel, LoyaltyProgramsPanel, TimelineRow, RiskMetric, InsightMetric, SeverityBadge, StatusPill, AuditCell, Info

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

### Customers page

Route: /dashboard/customers

Main file: src/app/dashboard/customers/page.tsx

Section name: Business customer memberships

Where defined: src/app/dashboard/customers/page.tsx

Component or local function: CustomersPage, Select, Message

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout; mobile-specific view; responsive grids.

### Programs page

Route: /dashboard/programs

Main file: src/app/dashboard/programs/page.tsx

Section name: Programs

Where defined: src/app/dashboard/programs/page.tsx

Component or local function: ProgramsPage, KpiCard, StatusBadge, EmptyPrograms

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, inputs/filters, responsive layout; mobile-specific view; responsive grids.

### Referrals page

Route: /dashboard/referrals

Main file: src/app/dashboard/referrals/page.tsx

Section name: Customer referral tracking

Where defined: src/app/dashboard/referrals/page.tsx

Component or local function: ReferralsPage, ReferralCard, Kpi, StatusPill

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: Referral list

Where defined: src/app/dashboard/referrals/page.tsx

Component or local function: ReferralsPage, ReferralCard, Kpi, StatusPill

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: Top referrers

Where defined: src/app/dashboard/referrals/page.tsx

Component or local function: ReferralsPage, ReferralCard, Kpi, StatusPill

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

### Staff page

Route: /dashboard/staff

Main file: src/app/dashboard/staff/page.tsx

Section name: Staff list

Where defined: src/app/dashboard/staff/page.tsx

Component or local function: StaffUsersPage, StaffCreateForm, Input, Message

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, tables, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; overflow/table handling; responsive grids.

### Branches page

Route: /dashboard/branches

Main file: src/app/dashboard/branches/page.tsx

Section name: Branch list

Where defined: src/app/dashboard/branches/page.tsx

Component or local function: BranchesPage, BranchForm, Input, Message

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

### Scanner page

Route: /dashboard/scanner

Main file: src/app/dashboard/scanner/page.tsx

Section name: Main content

Where defined: src/app/dashboard/scanner/page.tsx

Component or local function: BusinessOwnerScannerPage

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: basic JSX layout; No explicit mobile-only structure detected.

### Public customer card

Route: /card/[token]

Main file: src/app/card/[token]/page.tsx

Section name: No active loyalty program yet

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: Save Your Card

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: Additional programs

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: dynamic

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: dynamic

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: dynamic Visit$dynamic Remaining`}

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: dynamic

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: Refer a friend

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: Wallet Area

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

Section name: Card not available

Where defined: src/app/card/[token]/page.tsx

Component or local function: PublicCustomerCardPage, LoyaltyWalletCard, LoyaltyProgressSection, RewardStatusSection, TierStatusSection, ReferralCardSection, WalletPlaceholderSection, ProgramRewardCard, Info, CardUnavailable

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: cards/KPIs, inputs/filters, responsive layout; responsive grids; bottom navigation/safe area.

### Scan token page

Route: /scan/[token]

Main file: src/app/scan/[token]/page.tsx

Section name: dynamic dynamic

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: dynamic

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: dynamic dynamic

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: dynamic

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: dynamic

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: Which program should receive this scan?

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: dynamic

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

Section name: Add earned stamps

Where defined: src/app/scan/[token]/page.tsx

Component or local function: ScanResultPage, ScanMessage, ProgramSelectionScreen, ScanStatusBanner, StampIssuanceSection, Info, SummaryItem

Can external AI redesign safely? Yes, for visual structure/classes only while preserving data helpers and actions.

Notes: forms/actions, cards/KPIs, confirmations/modals/drawers, inputs/filters, responsive layout; responsive grids.

## Mapping Issues Found

- Expected/older route not found in current project: /dashboard/branding
- Expected/older route not found in current project: /platform/invoices/new
- src/app/page.tsx is present and mapped as public homepage, not dashboard.
- Dynamic routes such as [id], [token], and [code] are listed only where real page files exist.
- Some pages use desktop tables with overflow wrappers and/or separate mobile card sections; verify before mobile redesign.
- Static analysis may miss runtime-only component use, but no invented paths were added.

## Recommended Files to Send to External AI

### Homepage redesign
- src/app/page.tsx
- src/app/benefits/page.tsx
- src/app/request-demo/page.tsx
- src/components/DemoRequestForm.tsx

### Business Owner dashboard redesign
- src/app/dashboard/page.tsx
- src/components/DashboardShell.tsx
- src/components/RoleNavigation.tsx

### Customer 360 redesign
- src/app/dashboard/customers/[id]/page.tsx
- src/components/CardShareActions.tsx
- src/components/ConfirmSubmitButton.tsx

### Public customer card redesign
- src/app/card/[token]/page.tsx
- src/components/CardShareActions.tsx
- src/components/ReferralShareActions.tsx

### Scanner redesign
- src/app/dashboard/scanner/page.tsx
- src/app/branch/scanner/page.tsx
- src/app/staff/scanner/page.tsx
- src/app/scan/[token]/page.tsx
- src/components/CameraScanner.tsx

### Global navigation redesign
- src/components/DashboardShell.tsx
- src/components/RoleNavigation.tsx
- src/app/globals.css

## Verification Checklist

- Project tree scanned
- All routes verified from existing files
- No guessed folders
- No invented paths
- All recommended files exist
- All high-impact components marked
- Old incorrect mappings removed

## Generation Summary

- Real routes documented: 76
- Real components documented: 32
- App files scanned: 98
- Component files scanned: 32
- Lib files scanned: 41
- Prisma files scanned: 35
- Test files scanned: 40
