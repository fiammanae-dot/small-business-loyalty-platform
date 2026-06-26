# LoyaltyBase UI Inventory

Source scan: `src/app`, `src/components`, `tests`. This inventory lists real user-facing routes found in the project. API/export routes are noted only where they affect visible UI.

## Public And Authentication

| Page | Route | Purpose | User roles | Primary actions | Secondary actions | Components/layout | Mobile support | UX status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| Marketing homepage | `/` | Public sales page for prospective businesses | Public | Request demo, view benefits | Pricing teaser, FAQ | Local homepage sections, `HomepageMotion`, `HomepageLoyaltyCardDemo` | Responsive marketing layout | Good foundation | Medium |
| Benefits | `/benefits` | Explain LoyaltyBase value proposition | Public | Request demo | Return home | Local public layout | Responsive | Good | Low |
| Request Demo | `/request-demo` | Demo request lead form | Public | Submit demo request placeholder | Navigate public pages | `DemoRequestForm` | Responsive | Good | Low |
| Login | `/login` | Authenticate existing users | Public/auth users | Login | Forgot password, toggle password | `LoginForm` | Responsive | Stable | Low |
| Forgot Password | `/forgot-password` | Request password reset email | Public/auth users | Send reset link | Return login | `ForgotPasswordForm` | Responsive | Stable | Low |
| Reset Password | `/reset-password` | Set new password from token | Public/auth users | Reset password | Validation errors | `ResetPasswordForm` | Responsive | Stable | Low |
| Change Password | `/change-password` | Forced password change | Auth users | Save password | Validation errors | `ChangePasswordForm` | Responsive | Stable | Low |
| Business Inactive | `/business-inactive` | Friendly blocked-access state | Operational users | Return/login | Contact support text | Local page | Responsive | Stable | Low |
| Logout | `/logout` | Session ending route | Auth users | Clear session | Redirect login | Route handler | Not visual | Stable | Low |

## System Administrator

| Page | Route | Purpose | Primary actions | Secondary actions | Components/layout | Mobile support | UX status | Priority |
|---|---|---|---|---|---|---|---|---|
| Platform dashboard | `/platform` | Executive platform overview | Investigate KPI cards | Recent activity | `DashboardShell`, `PlatformKpiGrid`, local KPI cards | Mobile shell and 2-col KPIs | Good after cleanup | Medium |
| Businesses | `/platform/businesses` | Manage business tenants | View business | Edit, enable/disable, filters | `DashboardShell`, `MobileFilterDrawer`, `StatusBadge`, `SearchableCombobox` | Mobile cards + filter drawer | Good, desktop improved | Medium |
| Business detail | `/platform/businesses/[id]` | Tenant detail, billing, branches, invoices | Edit, enable/disable | Back, invoice history | `DashboardShell`, `StatusBadge`, local info cards | Mobile cards for invoices | Good | Medium |
| Create business | `/platform/businesses/new` | Create tenant with owner, branch, subscription | Create business | Plan/billing setup | `DashboardShell`, `BusinessForm` | Responsive form | Medium complexity | Medium |
| Edit business | `/platform/businesses/[id]/edit` | Edit tenant metadata | Save changes | Cancel | `DashboardShell`, `BusinessForm` | Responsive form | Medium complexity | Medium |
| Plans | `/platform/plans` | Plan comparison and usage | Review plans | Search/filter | `DashboardShell`, `PlatformKpiGrid`, `MobileFilterDrawer` | Mobile filter drawer | Good | Low |
| Subscriptions | `/platform/subscriptions` | Subscription lifecycle management | View subscription | More actions: suspend, activate, cancel, etc. | `DashboardShell`, `PlatformKpiGrid`, `MobileFilterDrawer`, confirmations | Mobile cards | Good | Medium |
| Invoices | `/platform/invoices` | Invoice status/payment management | View invoice | More actions: mark paid, cancel, record payment | `DashboardShell`, `MobileFilterDrawer`, confirmations | Mobile cards | Good | Medium |
| Invoice detail | `/platform/invoices/[id]` | Invoice detail and payment/audit context | Back/view | Lifecycle info | `DashboardShell` | Responsive cards | Acceptable | Low |
| Users | `/platform/users` | Platform-level user lifecycle management | View user | Edit, reset password, force logout, suspend, enable, archive | `DashboardShell`, `MobileFilterDrawer`, `StatusBadge`, `PlatformUserPasswordResetAction`, confirmations | Mobile cards | High sensitivity, functional | High |
| User detail | `/platform/users/[id]` | User lifecycle detail | Edit | Back | `DashboardShell`, `StatusBadge` | Responsive but inline dense source | Needs refactor | Medium |
| Edit user | `/platform/users/[id]/edit` | Safe user metadata/lifecycle edit | Save | Cancel | `DashboardShell`, local form | Responsive but inline dense source | Needs refactor | Medium |
| Health & Analytics | `/platform/health-analytics` | Platform performance and health | Export, inspect KPIs/charts | Filters | `DashboardShell`, `PlatformKpiGrid` | Partial mobile accordions/cards | Medium | Medium |
| Audit Center | `/platform/audit-center` | Audit events, alerts, governance | View details, export | Filters | `DashboardShell`, `PlatformKpiGrid`, `MobileFilterDrawer` | Mobile event cards | Good | Medium |
| Billing Center | `/platform/billing-center` | Subscription, invoice, revenue operations | Manage tabs, export | Filters | `DashboardShell`, `PlatformKpiGrid`, `MobileFilterDrawer`, `MobileAccordionSection` | Mobile accordions | Good but large | Medium |
| Tenant Center | `/platform/tenant-center` | Tenant overview, health, resources | View/edit business | Export, filter | `DashboardShell`, `PlatformKpiGrid`, `MobileFilterDrawer` | Mobile filter drawer | Good | Low |
| Settings | `/platform/settings` | Platform settings, demo mode, environment | Save settings | View roadmap/audit sections | `DashboardShell`, mobile selector patterns | Mobile dropdown | Good | Low |
| Database | `/platform/database` | Database health/admin status | Inspect health | Launch checks | `DashboardShell`, `PlatformKpiGrid` | Responsive cards | Good | Low |
| Launch Readiness | `/platform/launch-readiness` | Pilot readiness checklist | Review readiness | Follow recommendations | `DashboardShell` | Responsive cards | Good | Low |

## Business Owner

| Page | Route | Purpose | Primary actions | Secondary actions | Components/layout | Mobile support | UX status | Priority |
|---|---|---|---|---|---|---|---|---|
| Business dashboard | `/dashboard` | Daily operations overview | Scanner, customer lookup, KPI investigation | Activity, setup, billing links | `DashboardShell`, `StatusBadge`, local KPI/search/cards | Bottom nav, mobile cards | Needs final density pass | Critical |
| Customers | `/dashboard/customers` | Customer management list/search | View customer, edit, WhatsApp | Enroll, filters/export | `DashboardShell`, `StatusBadge`, `CardShareActions` | Mobile cards | Improved, still dense | High |
| Customer 360 | `/dashboard/customers/[id]` | Customer profile, loyalty, rewards, referrals | Open/copy/share card, issue stamp, redeem reward, edit | Tabs: overview/activity/rewards/referrals/programs | `DashboardShell`, `StatusBadge`, `CardShareActions`, tabs/local sections | Mobile single-column | Still long | Critical |
| New customer | `/dashboard/customers/new` | Enroll customer | Save customer | Referral phone lookup | `DashboardShell`, `ReferralPhoneLookupPreview` | Responsive form | Good | Medium |
| Edit customer | `/dashboard/customers/[id]/edit` | Edit customer data | Save | Cancel | `DashboardShell` | Responsive form | Good | Low |
| Programs | `/dashboard/programs` | Loyalty program management | Create/view program | Edit/disable | `DashboardShell`, local program cards/table | Mobile cards | Good | High |
| Program detail | `/dashboard/programs/[id]` | Program performance/detail | View customers, edit | Status/progress | `DashboardShell` | Responsive | Good after crash fix | Medium |
| New program | `/dashboard/programs/new` | Create loyalty program/theme | Save program | Preview theme | `DashboardShell`, `ProgramForm`, `CardThemePreviewSelector` | Responsive form/modal | Good | Medium |
| Edit program | `/dashboard/programs/[id]/edit` | Edit loyalty program | Save | Preview theme | `DashboardShell`, `ProgramForm` | Responsive | Good | Medium |
| Program customers | `/dashboard/programs/[id]/customers` | Customers enrolled in program | View customer | Back/filter | `DashboardShell` | Responsive | Medium | Medium |
| Referrals | `/dashboard/referrals` | Referral performance and management | View referral | Filter/share context | `DashboardShell` | Responsive | High value, can simplify | High |
| Referral detail | `/dashboard/referrals/[id]` | Single referral trace | Review status | Related customers | `DashboardShell` | Responsive | Good | Medium |
| Scanner landing | `/dashboard/scanner` | Start camera or universal lookup | Scan/search | Paste URL/token, manual lookup | `DashboardShell`, `CameraScanner`, `ScannerManualCustomerSearch` | Mobile first | Critical workflow | Critical |
| Activity | `/dashboard/activity` | Full activity timeline | Review events | Filter/detail | `DashboardShell` | Mobile cards | Good | Medium |
| Activity detail | `/dashboard/activity/[id]` | Single activity details | Review | Back | `DashboardShell` | Responsive | Good | Low |
| Staff | `/dashboard/staff` | Staff/manager user management | Reset password, disable | Add/review users | `DashboardShell`, `StaffPasswordResetAction`, `StatusBadge` | Responsive table/cards | Improved | Medium |
| Staff detail | `/dashboard/staff/[id]` | Staff profile | Review | Back | `DashboardShell`, `StatusBadge` | Responsive | Good | Low |
| Branches | `/dashboard/branches` | Branch overview | View/manage branch status | Compliance context | `DashboardShell`, `StatusBadge` | Responsive cards | Medium | Medium |
| Billing | `/dashboard/billing` | Business subscription/billing view | Review plan | Billing cycle/status | `DashboardShell` | Responsive | Medium | Medium |
| Settings | `/dashboard/settings` | Business settings, tiers, scanner, cooldowns | Save settings | Mobile section selector | `DashboardShell`, `SettingsMobileSectionSelect`, `StatusBadge` | Mobile dropdown | Good but broad | Low |
| Notifications | `/dashboard/notifications` | Alert center | View/resolve alert | Filters | `DashboardShell` | Responsive | Medium | Medium |
| Notification detail | `/dashboard/notifications/[id]` | Alert detail | Assign/resolve/dismiss | Back | `DashboardShell` | Responsive | Medium | Medium |
| Messages | `/dashboard/messages` | Message outbox | View message | Filter/status | `DashboardShell` | Responsive | Medium | Medium |
| Message detail | `/dashboard/messages/[id]` | Message detail | Review | Back | `DashboardShell` | Responsive | Medium | Low |
| Engagement | `/dashboard/engagement` | Engagement event previews | View event | Filters | `DashboardShell` | Responsive | Partial/Future | Low |
| Engagement detail | `/dashboard/engagement/[id]` | Engagement detail | Review | Back | `DashboardShell` | Responsive | Partial/Future | Low |
| Profile | `/dashboard/profile` | Business/account profile | Review business | Status details | `DashboardShell`, `StatusBadge` | Responsive | Good | Low |

## Branch Manager

| Page | Route | Purpose | Primary actions | Secondary actions | Components/layout | Mobile support | UX status | Priority |
|---|---|---|---|---|---|---|---|---|
| Branch dashboard | `/branch` | Branch supervisor operations | Scanner, find customer | Staff activity, program summary | `DashboardShell` | Mobile bottom nav | Good, role differentiation improved | High |
| Branch customers | `/branch/customers` | Branch/business customer search | View customer | Enroll | `DashboardShell`, `StatusBadge` | Mobile cards | Good | Medium |
| Branch customer detail | `/branch/customers/[id]` | Read customer profile | Review card/programs | Back | `DashboardShell`, `StatusBadge` | Responsive | Good | Medium |
| Branch enroll customer | `/branch/customers/new` | Enroll customer | Save | Referral phone lookup | `DashboardShell` | Responsive | Good | Medium |
| Branch programs | `/branch/programs` | Read-only program performance | View program | View customers | `DashboardShell` | Mobile cards | Good | Medium |
| Branch program detail | `/branch/programs/[id]` | Program detail/performance | View customers | Back | `DashboardShell` | Responsive | Good | Low |
| Branch program customers | `/branch/programs/[id]/customers` | Program customer list | View customer | Back | `DashboardShell` | Responsive | Medium | Low |
| Branch scanner | `/branch/scanner` | Scan customer cards | Scan/search | Universal lookup | `DashboardShell`, `CameraScanner` | Mobile first | Critical workflow | Critical |

## Staff

| Page | Route | Purpose | Primary actions | Secondary actions | Components/layout | Mobile support | UX status | Priority |
|---|---|---|---|---|---|---|---|---|
| Staff dashboard | `/staff` | Daily cashier operations | Scanner, enroll, find customer | Programs | `DashboardShell` | Mobile bottom nav | Good | High |
| Staff scanner | `/staff/scanner` | Scan customer cards | Scan/search | Universal lookup | `DashboardShell`, `CameraScanner` | Mobile first | Critical workflow | Critical |
| Staff customers | `/staff/customers` | Find customer read-only | Search/open profile | None | `DashboardShell`, `StatusBadge` | Mobile cards | Good | Medium |
| Staff customer detail | `/staff/customers/[id]` | Read-only customer profile | Review QR/progress | Back | `DashboardShell`, `StatusBadge` | Responsive | Good | Medium |
| Staff enroll customer | `/staff/customers/new` | Enroll new customer | Save | Referral phone lookup | `DashboardShell`, `ReferralPhoneLookupPreview` | Responsive | Good | Medium |
| Staff enrollment success | `/staff/customers/success` | Post-enrollment card delivery | Copy/share/open card | WhatsApp | `DashboardShell`, `CardShareActions` | Responsive | Good | Medium |
| Staff programs | `/staff/programs` | Read-only active programs | Review | None | `DashboardShell` | Responsive | Good | Low |

## Public Customer And Referral

| Page | Route | Purpose | Primary actions | Secondary actions | Components/layout | Mobile support | UX status | Priority |
|---|---|---|---|---|---|---|---|---|
| Public customer card | `/card/[token]` | Customer-facing loyalty card | Show QR, copy/share/save image | Referral accordion | `CardShareActions`, `ReferralShareActions`, `SaveCardImageButton`, `CopyButton` | Mobile first | Good, high impact | High |
| Referral landing | `/referral/[code]` | Public referral invitation | Show QR, copy/share link | How it works | `ReferralInviteActions` | Mobile first | Good | Medium |
| Scan result | `/scan/[token]` | Authenticated scan validation/result | Add stamp/redeem/select program | Accordions/details | `DashboardShell`, `StatusBadge`, confirmations | Mobile first | Critical | Critical |
| Referral scan result | `/scan/referral/[code]` | Authenticated referral QR validation | Enroll with referral | Security messages | `DashboardShell` | Mobile first | Medium | High |

## Non-Visual Routes Affecting UI

- `/api/session/idle-logout`: idle session behavior.
- `/dashboard/exports/[type]`: business export downloads.
- `/platform/*/export`: platform export downloads for audit, billing, tenant, health analytics.

## Inventory Notes

- `src/app/dashboard/branding` exists as a folder but no `page.tsx` route was found in the scan; it should not be treated as a live route.
- System Administrator pages mostly use shared mobile filter/KPI primitives.
- Operational roles share `DashboardShell` and `RoleNavigation`, making navigation changes high impact.
- Several pages still define local variants of badges, cards, status chips, and action menus.
