# Loyalty Card UAE Feature Inventory

Version: 1.0

## Authentication

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Login/logout | Complete | `src/app/login/*`, `src/app/logout/route.ts`, `src/lib/session.ts` | `tests/auth-navigation.test.mjs` |
| Role redirects | Complete | `src/lib/roles.ts`, `src/lib/session.ts` | `tests/auth-navigation.test.mjs`, `tests/role-permissions.test.mjs` |
| CSRF protection | Complete | `src/components/CsrfInput.tsx`, auth/actions | `tests/launch-hardening-phase-1.test.mjs` |
| Failed login audit/rate limit | Complete | login actions, schema | `tests/launch-hardening-phase-1.test.mjs` |
| Idle logout | Complete | `IdleSessionTimeout`, idle logout API | `tests/session-idle-timeout.test.mjs` |

## Customers

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Customer create/edit/search | Complete | dashboard/branch/staff customer pages, `src/lib/customers.ts` | tenant and UX tests |
| UAE phone normalization | Complete | customer helper/actions | `tests/phone-normalization.test.mjs` |
| Public card | Complete | `src/app/card/[token]/page.tsx` | card/WhatsApp/tier tests |
| WhatsApp card sharing | Complete | `src/app/card-share-actions.ts` | `tests/whatsapp-card-delivery.test.mjs` |
| Customer 360 | Complete/Iterative | `src/app/dashboard/customers/[id]/page.tsx` | `tests/ux-readiness.test.mjs` |

## Programs

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Program create/edit/list | Complete | `src/app/dashboard/programs/**`, `src/app/branch/programs/**` | program and subscription limit tests |
| Program limits by plan | Complete | program actions, `src/lib/subscriptions.ts` | `tests/subscription-plan-single-source.test.mjs` |
| Referral reward bonus stamps | Complete | program schema/actions | referral tests |

## Branches

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Branch CRUD/status | Complete | `src/app/dashboard/branches/page.tsx` | subscription limit and tenant tests |
| Branch limits by plan | Complete | dashboard actions | `tests/subscription-plan-single-source.test.mjs` |
| Inactive branch enforcement | Complete | scan/stamp/redeem actions | hardening tests |

## Staff

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Staff/manager management | Complete | `src/app/dashboard/staff/**` | role and staff password reset tests |
| Staff password reset | Complete | staff detail/actions | `tests/staff-password-reset.test.mjs` |
| Force password change | Complete | change-password pages/actions | auth tests |

## Scanner

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Camera scanner | Complete/Browser-dependent | `CameraScanner`, scanner pages | `tests/phase-8-scanner.test.mjs` |
| Manual token fallback | Complete | `CameraScanner`, scan actions | scanner tests |
| Scan validation | Complete | `src/app/scan/[token]/page.tsx`, `src/app/scan/actions.ts` | scanner and tenant tests |

## Rewards

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Reward readiness | Complete | loyalty actions, scan page | reward tests |
| Redemption | Complete | scan actions, redemptions table | hardening/reward tests |
| Immutable redemption records | Complete | migration 0011 | immutability tests |

## Referrals

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Referral links/codes | Complete | `src/lib/referrals.ts`, card page | referral tests |
| Pending to qualified after first stamp | Complete | stamp/referral logic | referral tests |
| Referral dashboard | Complete | `src/app/dashboard/referrals/**` | referral tests |

## Billing and Subscriptions

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Three-plan system | Complete | `src/lib/subscription-plans.ts`, seeds, migration 0023 | `tests/subscription-plan-single-source.test.mjs` |
| Subscription lifecycle | Complete | platform subscriptions page/actions | subscription tests |
| Billing Center | Complete/Operational UI | `src/app/platform/billing-center/page.tsx` | platform tests |
| Invoices/payments | Complete | platform invoices pages/actions | billing tests |

## Notifications and Messages

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Engagement events | Complete | `src/lib/engagement.ts`, dashboard engagement pages | engagement tests |
| Message queue | Complete, no provider sending | message pages/actions | message tests |
| Customer notifications | Complete, WhatsApp-ready only | customer notification tables/actions | notification tests |

## Settings and Tier System

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| Business branding | Complete | branding/settings pages, business_branding table | UX tests |
| Tier settings | Complete | `src/lib/customer-tiers.ts`, settings page | customer tier tests |
| Demo mode | Complete | platform settings/actions | demo mode tests |
| Platform settings console | Complete | platform settings page | platform settings tests |

## Reports and Exports

| Feature | Status | Related files | Related tests |
|---|---|---|---|
| CSV exports | Complete | `src/app/dashboard/exports/[type]/route.ts` | UX/readiness tests |
| PDF/Excel export buttons | Partial/Future provider generation | analytics/audit/billing pages | platform tests |

