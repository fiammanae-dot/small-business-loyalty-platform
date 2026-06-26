# Technical Debt Report

## Highest UI Technical Debt

| Area | Evidence | Risk | Recommended action |
|---|---|---|---|
| Oversized route files | Many pages own fetching, calculations, sections, mobile cards, tables, actions, and local components together | High | Split visual sections into components after redesign direction is approved |
| Local duplicate badges | Shared `StatusBadge` exists but local `StatusBadge` functions also appear in tenant center, programs, messages, audit center | Medium | Expand shared badge API and replace locals |
| Table/mobile-card duplication | Platform and operational pages repeat desktop table plus mobile card structures | Medium | Create `ResponsiveRecordList` pattern |
| Action menu variation | Admin actions vary by page; confirmations exist but menus are local | High | Shared `ActionMenu` plus `ConfirmAction` wrapper |
| KPI card variation | Platform has `PlatformKpiGrid`; operational pages use local cards | Medium | Shared `MetricCard` with actionable state |
| Detail page repetition | Customer, business, invoice, user, staff, program details repeat info grids and headers | Medium | Shared `DetailHeader`, `InfoGrid`, `InfoRow` |
| Scanner complexity | Scanner route and result page handle many states, actions, permissions, QR formats | Critical | Keep logic stable; extract visual components only with tests |
| Business branding drift | Operational pages use business variables, but local icons/classes can regress to orange | Medium | Theme lint/test patterns for operational routes |
| Mobile drawer/menu complexity | More sheets and filter drawers are custom and role-specific | Medium | Standardize drawer bottom-sheet primitive |
| Public card/referral specialization | Public card has many customer-facing microinteractions | High | Keep focused components; avoid mixing referral and card internals |

## High-Risk Files

- `src/components/DashboardShell.tsx`
- `src/components/RoleNavigation.tsx`
- `src/components/CameraScanner.tsx`
- `src/app/scan/[token]/page.tsx`
- `src/app/dashboard/customers/[id]/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/card/[token]/page.tsx`
- `src/app/referral/[code]/page.tsx`
- `src/app/platform/billing-center/page.tsx`
- `src/app/platform/audit-center/page.tsx`
- `src/app/platform/users/page.tsx`
- `src/components/ProgramForm.tsx`
- `src/components/BusinessForm.tsx`

## Mixed Responsibility Patterns

- Server route pages frequently combine data fetching, authorization assumptions, formatting helpers, local subcomponents, tables, mobile cards, and actions.
- Some detail pages, especially newer admin user detail/edit pages, are very dense and difficult to review.
- Local UI helpers are repeated because the project has useful primitives but not yet a complete design-system layer.

## Obsolete Or Suspicious UI

- `src/app/dashboard/branding` exists as a folder but no route page was found; keep it non-routed unless branding management is approved later.
- Future/roadmap settings panels should remain collapsed and clearly labeled as planned capabilities.
- Wallet placeholder UI should not return until real Apple/Google Wallet support exists.
- Demo/manual-audit seed data is isolated; keep production/pilot UI free of demo labels unless demo mode is explicitly enabled.

## Reusable Candidates

Immediate:

- `MetricCard`
- `ActionMenu`
- `ResponsiveRecordList`
- `EmptyState`
- `InfoGrid` / `InfoRow`
- `ProgressBar`

Later:

- `PublicPageShell`
- `AuthPageShell`
- `Timeline`
- `FilterBar`
- `DetailHeader`
- `SectionCard`

## Technical Debt Score

Current technical debt score: 63/100.

Meaning:

- Product is launchable with targeted safeguards.
- Redesign work should include component extraction, but only page by page.
- Biggest danger is changing high-impact shared shell/scanner components without regression tests.
