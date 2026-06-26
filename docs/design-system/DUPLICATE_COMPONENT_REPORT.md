# Duplicate Component Report

## Status Badges

Found in:
- Shared `src/components/StatusBadge.tsx`
- Local `StatusBadge` in `src/app/platform/tenant-center/page.tsx`
- Local `StatusBadge` in `src/app/dashboard/programs/page.tsx`
- Local `StatusBadge` in `src/app/dashboard/messages/page.tsx`
- Local `StatusBadge` in `src/app/platform/audit-center/page.tsx`
- Shared usage across customers, staff, scan result, business detail, subscriptions, users.

Recommendation:
- Expand shared `StatusBadge` to support boolean active state, label-only badges, audit statuses, delivery statuses, and semantic variants.
- Replace page-local versions gradually.

Risk:
- Medium. Badges are visible everywhere but logic is mostly presentational.

## KPI / Metric Cards

Found in:
- `PlatformKpiGrid` for System Administrator pages.
- Local KPI cards on Business Owner dashboard.
- Local KPI cards in Staff/Branch dashboards.
- Local cards in Customer 360 and Scanner result.

Recommendation:
- Create shared `MetricCard` with optional `href`, icon, label, value, helper text, active/actionable state, compact mobile mode.

Risk:
- Medium. Cards frequently include links/filters.

## Page Headers

Found in:
- `DashboardShell` provides title/eyebrow.
- Many pages add another local section header inside first card.
- Public pages use local header/section headings.

Recommendation:
- Standardize `PageIntro`, `SectionHeader`, and `DetailHeader`.
- Keep public marketing headers separate.

Risk:
- Medium. Header changes affect vertical density and navigation clarity.

## Filter Bars

Found in:
- Platform businesses, users, invoices, subscriptions, plans, audit center, billing center, tenant center.
- Business Owner customers/programs/referrals use local filter/search patterns.

Existing shared piece:
- `MobileFilterDrawer`.

Recommendation:
- Extract `FilterBar` for desktop and use `MobileFilterDrawer` for mobile.
- Keep query param logic page-owned.

Risk:
- Medium.

## Responsive Table + Mobile Cards

Found in:
- Businesses, subscriptions, invoices, users, audit events, billing center sections, customers, staff, branch customers.

Recommendation:
- Create `ResponsiveRecordList` wrapper with named desktop/mobile slots.
- Do not abstract data fetching.

Risk:
- Medium.

## Action Menus

Found in:
- Platform businesses, subscriptions, invoices, users.
- Business Owner staff/users/actions.
- Customer list actions.

Recommendation:
- Create shared `ActionMenu` with confirmation support and danger styling.
- Use visible primary action + More menu pattern consistently.

Risk:
- High where actions mutate lifecycle/payment/user status.

## Confirmation Dialogs

Found in:
- `ConfirmSubmitButton` for high-risk actions.
- Some actions may still rely on form submit or custom modal patterns.

Recommendation:
- Continue consolidating around `ConfirmSubmitButton` or a shared `ConfirmActionDialog`.

Risk:
- High because confirmations guard destructive actions.

## Search Inputs

Found in:
- Scanner universal lookup.
- Customer list/search.
- Staff find customer.
- Branch customer search.
- Platform filters.

Recommendation:
- Shared `SearchField` and `SearchResultsList` for consistent width, icon placement, empty state, and keyboard behavior.

Risk:
- Medium.

## Progress Bars

Found in:
- Public card loyalty progress.
- Customer 360 program progress.
- Scanner result progress.
- Program cards/detail pages.
- Tier progress.

Recommendation:
- Create shared `ProgressBar` and `ProgramProgressSummary` with label/value/reward-ready slots.

Risk:
- High in scanner/public card because progress must match loyalty logic.

## Detail Info Rows

Found in:
- User detail, business detail, invoice detail, staff detail, customer detail, branch/program details.

Recommendation:
- Extract `InfoRow`, `InfoGrid`, `MetadataCard`.

Risk:
- Low to medium.

## Empty States

Found in:
- Many page-local implementations for empty customers, programs, audit events, invoices, alerts, messages.

Recommendation:
- Shared `EmptyState` with icon, title, message, optional action.

Risk:
- Low.

## Public Card / Referral Share Actions

Found in:
- `CardShareActions`, `ReferralShareActions`, `ReferralInviteActions`, `CopyButton`, `SaveCardImageButton`.

Recommendation:
- Keep specialized share components but align button sizes, icon styles, and feedback messages.

Risk:
- Medium because public links and WhatsApp share must preserve URL rules.
