# Loyalty Card UAE Component Reuse Map

Version: 1.0

## High Impact Components

| Component | File | Used in pages | Dependencies | Risk if modified |
|---|---|---|---|---|
| `DashboardShell` | `src/components/DashboardShell.tsx` | All authenticated platform/dashboard/branch/staff pages | session user, demo mode, nav, CSRF, idle timeout | Very High |
| `SearchableCombobox` | `src/components/SearchableCombobox.tsx` | platform businesses/users/subscriptions/invoices, billing/tenant filters, business filters | client state, keyboard nav, options data | High |
| `CameraScanner` | `src/components/CameraScanner.tsx` | `/dashboard/scanner`, `/branch/scanner`, `/staff/scanner` | camera API, QR parser, manual fallback | Very High |
| `LoginForm` | `src/components/LoginForm.tsx` | `/login` | login action, password visibility | High |
| `BusinessForm` | `src/components/BusinessForm.tsx` | `/platform/businesses/new`, edit flow | business actions, plan fields | High |
| `PlanBillingCycleFields` | `src/components/PlanBillingCycleFields.tsx` | business creation/subscription creation | subscription plan helpers | High |
| `CsrfInput` | `src/components/CsrfInput.tsx` | mutating forms | CSRF scope helpers | Very High |
| `IdleSessionTimeout` | `src/components/IdleSessionTimeout.tsx` | `DashboardShell` | idle logout API | High |

## Page-Level Component Patterns

- KPI cards: repeated across platform dashboard, business dashboard, plans, subscriptions, billing, audit, notifications.
- Status badges: used for plan, subscription, alert, user, business, tier, message, invoice states.
- Mobile cards: used as responsive alternatives to tables on management pages.
- Filter toolbars: used on businesses, users, subscriptions, invoices, messages, notifications, programs, referrals.
- Action dropdowns: used where many row actions exist, especially subscriptions/invoices/alerts.
- Drawers/detail panels: used in alert center and audit center.

## Components Used in 3+ Locations

| Component/Pattern | Locations | Editing impact |
|---|---|---|
| `DashboardShell` | every authenticated page | Navigation, session, demo banner, page layout |
| `SearchableCombobox` | platform/business management pages | Filtering and selector UX |
| KPI card pattern | dashboards and centers | Visual density and metric consistency |
| Status badge pattern | all role dashboards | State clarity and accessibility |
| Mobile card pattern | management pages | Mobile usability |
| `CameraScanner` | scanner routes | QR scanning and manual fallback |

## Recommended Component Governance

- Any change to `DashboardShell`, `CsrfInput`, `SearchableCombobox`, or `CameraScanner` should run the full test suite and manual route smoke test.
- Avoid duplicating new selector/dropdown behavior; extend `SearchableCombobox`.
- Avoid page-specific scanner UI forks; use `CameraScanner` and keep validation in `/scan/[token]`.

