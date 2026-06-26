# Redesign Priority Matrix

## Critical

| Page/workflow | Route/files | Why critical | Redesign goal |
|---|---|---|---|
| Scanner result and scanner landing | `/scan/[token]`, `/dashboard/scanner`, `/branch/scanner`, `/staff/scanner`, `CameraScanner` | Daily cashier workflow; affects stamps, rewards, referrals, tenant security | Complete actions in 3-5 seconds on mobile, no duplicate states |
| Customer 360 | `/dashboard/customers/[id]` | Dense operational profile with card, loyalty, referral, rewards, tier data | Reduce scrolling, compact overview, keep tabs |
| Business Owner dashboard | `/dashboard` | Primary daily operations screen | Operational-first, compact KPIs, scanner/customer lookup prominent |
| Public customer card | `/card/[token]` | Customer-facing retention artifact | Premium, clear QR/progress/reward/referral, no internal data |

## High

| Page/workflow | Route/files | Why high | Redesign goal |
|---|---|---|---|
| Customer list | `/dashboard/customers` | High-volume daily management | Clean table/cards, fast search, compact actions |
| Programs | `/dashboard/programs`, program detail/edit pages | Core loyalty configuration | Standard program cards and progress summaries |
| Referral Center | `/dashboard/referrals`, `/dashboard/referrals/[id]` | Growth loop and reward trust | Clear funnel/status, less reporting clutter |
| Branch Manager dashboard | `/branch` | Supervisor workflow differentiation | Staff activity, branch validation, scanner/customer lookup |
| Staff dashboard/enrollment | `/staff`, `/staff/customers/new`, success page | Cashier onboarding workflow | Fast enroll/share/card delivery |
| Platform users | `/platform/users` | High-risk admin lifecycle actions | Compact safe actions, clear filters, audit visibility |

## Medium

| Page/workflow | Route/files | Why medium | Redesign goal |
|---|---|---|---|
| Staff management | `/dashboard/staff` | Business Owner admin but not hourly workflow | Compact actions and status clarity |
| Branches | `/dashboard/branches` | Important for plan compliance | Better branch activity/compliance clarity |
| Business billing | `/dashboard/billing` | Account administration | Clear status without crowding dashboard |
| Business settings | `/dashboard/settings` | Broad configuration page | Preserve mobile selector, reduce section overload |
| Platform businesses | `/platform/businesses` and details | Admin management is functional but dense | Maintain polished tables/cards |
| Platform billing center | `/platform/billing-center` | Large admin hub | Keep tabs, continue reducing stacked dashboards |
| Platform audit center | `/platform/audit-center` | Security/compliance | Maintain mobile cards and detail clarity |
| Platform invoices/subscriptions | `/platform/invoices`, `/platform/subscriptions` | Admin lifecycle workflows | Keep no-horizontal-scroll management pattern |

## Low

| Page/workflow | Route/files | Why low | Redesign goal |
|---|---|---|---|
| Authentication | `/login`, `/forgot-password`, `/reset-password`, `/change-password` | Stable and isolated | Polish only, do not disturb security |
| Public marketing pages | `/`, `/benefits`, `/request-demo` | Good current foundation | Conversion polish |
| Platform settings/database/launch readiness | `/platform/settings`, `/platform/database`, `/platform/launch-readiness` | Lower frequency admin tools | Consistency and responsive polish |
| Engagement/messages | `/dashboard/engagement`, `/dashboard/messages` | Useful but secondary | Keep clear status and future wording |

## Recommended Redesign Order

1. Scanner landing/result workflow.
2. Customer 360.
3. Business Owner dashboard.
4. Public customer card.
5. Customer list.
6. Programs.
7. Referral Center and public referral landing.
8. Staff/Branch operational dashboards.
9. Business settings/staff/branches/billing.
10. Platform users/businesses/subscriptions/invoices.

## Guardrails

- Do not redesign global navigation and scanner in the same sprint.
- Keep scanner business logic untouched while changing scanner layout.
- Extract reusable visual components after the redesigned target page proves the pattern.
- Add or update tests before touching high-risk action visibility.
