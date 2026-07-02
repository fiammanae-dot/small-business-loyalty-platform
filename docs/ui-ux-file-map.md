# LoyaltyBase UI/UX File Map

Generated from the real project tree on 2026-07-02. This map documents verified files only. It does not include guessed routes, invented folders, or stale paths from older maps.

## Scan Summary

- Scanned folders: `src/app`, `src/components`, `src/lib`, `prisma`, `tests`.
- Verified Next route/layout/handler files: 98.
- Verified page files: 88.
- Verified route handlers: 9.
- Verified component files under `src/components`: 100.
- Prisma root files found: `prisma/schema.prisma`, seed scripts, and migrations `0001` through `0040`.
- Tests folder contains Node/MJS regression suites for permissions, scanning, public cards, Design Studio, tenant isolation, subscriptions, support sessions, and UI readiness.

## Existing Project Folders

### `src/app`

Real top-level app areas:

- Public/marketing: `page.tsx`, `benefits`, `company`, `faq`, `pricing`, `request-demo`, `resources`, `solutions`, `business-inactive`.
- Auth/account: `login`, `logout`, `forgot-password`, `reset-password`, `change-password`, `api/session/idle-logout`.
- Public customer flows: `card/[token]`, `join/program/[token]`, `referral/[code]`, `scan/[token]`, `scan/referral/[code]`.
- Business Owner: `dashboard/**`.
- Branch Manager: `branch/**`.
- Staff: `staff/**`.
- System Administrator: `platform/**`.
- Support session route handlers: `support-session/activity`, `support-session/expired`.

### `src/components`

Real component groups:

- Root shared components: forms, scanner, sharing, dashboard shell, support controls, Design Studio.
- `src/components/ui`: shared UI system primitives.
- `src/components/domain`: domain display cards and badges.
- `src/components/layouts`: page layout wrappers.
- `src/components/marketing`: marketing shell.
- `src/components/public-card`: public wallet/card renderers and export renderers.

### `src/lib`

Important UI-connected data/helper areas:

- Auth/session/roles: `session`, `roles`, `business-owner`, `business-context`.
- Customers/cards/scanner: `customers`, `customer-cards`, `customer-tiers`, `scan`, `rewards`, `referrals`.
- Business/branding/programs: `business-branding`, `business-display`, `programs`, `program-join`, `card-themes`.
- Design Studio: `card-design`, `card-render-model`, `card-asset-catalog`, `design-studio`.
- Platform/admin: `billing`, `subscriptions`, `subscription-plans`, `database-health`, `platform-settings`, `support-sessions`, `support-activity`.
- UI support: `format`, `phone`, `csv`, `export-files`, `whatsapp-messages`, `form-state`, `color-contrast`.

## Verified Route Map

Each entry below is a verified Next.js route/layout/handler file. The fields match the requested mapping format, compressed for readability.

### Public, Auth, Customer, and Root Routes

| Route | Main file | Purpose | Role access | Imported components | Local sections/functions | Connected actions | Connected lib/data files | Tables/cards/forms/modals | Styling method | Mobile layout notes | Risk level when editing | Safe redesign notes | Files to send to external UI/UX AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| root layout | `src/app/layout.tsx` | Global app HTML shell, toaster, global CSS | All users | `AppToaster` | Metadata/root body | None | None | Global toast only | `globals.css` | Affects every page | HIGH | Only redesign global wrappers/styles with regression checks | `src/app/layout.tsx`, `src/app/globals.css`, `src/components/AppToaster.tsx` |
| `/` | `src/app/page.tsx` | Public marketing homepage | Public | `HomepageMotion`, `MarketingLayout` | Hero, product story, feature/CTA sections | None | None | Marketing cards/buttons | Tailwind, marketing shell | Responsive marketing sections | MEDIUM | Safe for visual redesign if links stay intact | `src/app/page.tsx`, `src/components/HomepageMotion.tsx`, `src/components/marketing/MarketingLayout.tsx` |
| `/benefits` | `src/app/benefits/page.tsx` | Marketing benefits page | Public | `MarketingLayout` | Benefits copy/cards | None | None | Marketing cards | Tailwind | Responsive grid | LOW | Copy/layout safe | file + `MarketingLayout` |
| `/company` | `src/app/company/page.tsx` | Company marketing page | Public | `MarketingLayout` | Company story/cards | None | None | Cards | Tailwind | Responsive sections | LOW | Copy/layout safe | file + `MarketingLayout` |
| `/faq` | `src/app/faq/page.tsx` | FAQ marketing page | Public | `MarketingLayout` | FAQ sections | None | None | FAQ blocks | Tailwind | Stacked mobile | LOW | Copy/layout safe | file + `MarketingLayout` |
| `/pricing` | `src/app/pricing/page.tsx` | Pricing marketing page | Public | `MarketingLayout` | Pricing cards/CTA | None | None | Pricing cards | Tailwind | Responsive pricing grid | LOW | Visual safe if plan claims remain accurate | file + `MarketingLayout` |
| `/request-demo` | `src/app/request-demo/page.tsx` | Request demo form | Public | `DemoRequestForm`, `MarketingLayout` | Form shell/copy | Form action inside component | Request/demo helpers in component | Form | Tailwind | Mobile stacked | MEDIUM | Preserve form fields/action | file + `DemoRequestForm` |
| `/resources` | `src/app/resources/page.tsx` | Marketing resources page | Public | `MarketingLayout` | Resource cards | None | None | Cards | Tailwind | Responsive grid | LOW | Copy/layout safe | file + `MarketingLayout` |
| `/solutions` | `src/app/solutions/page.tsx` | Marketing solutions page | Public | `MarketingLayout` | Solutions table/cards | None | None | Cards/table-like sections | Tailwind | Responsive sections | LOW | Copy/layout safe | file + `MarketingLayout` |
| `/business-inactive` | `src/app/business-inactive/page.tsx` | Safe inactive-business state | Authenticated business roles | None | Message/actions | None | `session` | Status panel | Tailwind | Centered mobile | MEDIUM | Preserve neutral wording and logout/navigation | file |
| `/login` | `src/app/login/page.tsx` | Login page | Public/redirects authenticated users | `LoginForm` | Auth shell | Login action inside component | `csrf`, `session` | Login form | Tailwind | Two-column/stacked auth layout | MEDIUM | Preserve CSRF and redirect behavior | file + `LoginForm` |
| `/logout` | `src/app/logout/route.ts` | Logout route handler | Authenticated | None | Route handler | Logout/session cleanup | `csrf`, `session` | No UI | N/A | N/A | HIGH | No UI redesign; route handler only | Not UI AI material |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Forgot password request page | Public | `ForgotPasswordForm` | Auth shell | Form action inside component | `csrf`, `session` | Form | Tailwind | Mobile stacked | MEDIUM | Preserve CSRF and email flow | file + component |
| `/reset-password` | `src/app/reset-password/page.tsx` | Password reset page | Public token flow | `ResetPasswordForm` | Auth shell | Form action inside component | `csrf`, `session` | Form | Tailwind | Mobile stacked | MEDIUM | Preserve token inputs/errors | file + component |
| `/change-password` | `src/app/change-password/page.tsx` | Authenticated password change | Authenticated | `ChangePasswordForm` | Account security form | Form action inside component | `csrf`, `session` | Form | Tailwind | Mobile stacked | MEDIUM | Preserve password field clearing/security | file + component |
| `/api/session/idle-logout` | `src/app/api/session/idle-logout/route.ts` | Idle logout API route | Authenticated/API | None | Route handler | Session cleanup | `session` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/card/[token]` | `src/app/card/[token]/page.tsx` | Public customer loyalty card | Public token | `CardShareActions`, `SaveCardImageButton`, `public-card/*` | Wallet card, tier, referral, save card sections | None | `customer-cards`, `card-themes`, `card-design`, `card-render-model`, `customer-tiers`, `programs`, `scan`, `referrals`, `prisma` | Public card, tier/refer/save cards, export buttons | Tailwind, business/card theme tokens | Centered narrow card layout | HIGH | Safe visual edits only if QR/token/export remain intact | file, `src/components/public-card/*`, `SaveCardImageButton`, `CardShareActions`, `src/lib/card-render-model.ts` |
| `/join/program/[token]` | `src/app/join/program/[token]/page.tsx` | Public program join/enrollment page | Public token | `BusinessBrandingProvider` | Enrollment form/success/error states | `src/app/join/program/[token]/actions.ts` | `business-branding`, `customer-cards`, `prisma` | Form/cards | Tailwind, business tokens | Centered mobile-first form | HIGH | Preserve token validation and enrollment action | file + actions + `CustomerCreateForm` patterns |
| `/referral/[code]` | `src/app/referral/[code]/page.tsx` | Public referral landing page | Public code | `BusinessBrandingProvider`, `ReferralInviteActions` | Referral landing/invite sections | Invite actions in component | `business-branding`, `customer-cards`, `customer-tiers`, `referrals`, `roles`, `prisma` | Invite panel | Tailwind, business tokens | Mobile centered | HIGH | Preserve referral code handling | file + `ReferralInviteActions` |
| `/scan/[token]` | `src/app/scan/[token]/page.tsx` | Staff/manager/owner scan result and issue stamp workflow | Authenticated scanner roles | `DashboardShell`, `ScannerSoundFeedback`, `StampWhatsAppSharePrompt`, `ScannerResultCard`, UI/layouts | Customer result, issue stamp, redeem, undo/share prompts | `src/app/scan/actions.ts` | `commercial-access`, `customer-cards`, `customer-tiers`, `programs`, `referrals`, `rewards`, `scan`, `prisma` | Forms, action cards, status badges | Tailwind, dashboard shell | Responsive scanner result layout | HIGH | Redesign carefully; this is operational and permission-sensitive | file, `src/app/scan/actions.ts`, scanner components |
| `/scan/referral/[code]` | `src/app/scan/referral/[code]/page.tsx` | Referral scan redirect/landing | Authenticated scanner roles | None imported | Referral scan handler page | None in file | None imported | Minimal UI | Tailwind/Next page | Mobile simple | MEDIUM | Inspect before redesign due sparse imports | file |
| `/support-session/activity` | `src/app/support-session/activity/route.ts` | Support activity route handler | Support session | None | Route handler | Support activity writes | `support-activity`, `support-sessions` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/support-session/expired` | `src/app/support-session/expired/route.ts` | Expired support session route handler | Support session | None | Route handler | Support expiration | `support-activity`, `support-sessions`, `prisma`, `session` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |

### Business Owner Routes

| Route | Main file | Purpose | Role access | Imported components | Local sections/functions | Connected actions | Connected lib/data files | Tables/cards/forms/modals | Styling method | Mobile layout notes | Risk level when editing | Safe redesign notes | Files to send to external UI/UX AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | Business Owner dashboard | Business Owner | `DashboardShell`, `DashboardPageLayout`, `MetricCard`, UI | KPIs, support session prompt, quick actions, activity | `platform/businesses/support-actions` | `business-owner`, `business-display`, `plan-compliance`, `support-sessions`, `roles`, `prisma` | KPI cards, action cards | Tailwind, business tokens | Responsive grids | HIGH | Safe UI redesign if data queries/actions untouched | file, `DashboardShell`, UI/layout components |
| `/dashboard/activity` | `src/app/dashboard/activity/page.tsx` | Activity/alerts list | Business Owner | `DashboardShell`, `EmptyState`, `MetricCard` | Metrics, activity list | None | `business-owner`, `format`, `prisma` | Metric/list cards | Tailwind | Stacked lists mobile | MEDIUM | Preserve filters/detail links | file |
| `/dashboard/activity/[id]` | `src/app/dashboard/activity/[id]/page.tsx` | Activity detail | Business Owner | `DashboardShell` | Detail summary/timeline | None | `business-owner`, `alert-investigation`, `format`, `programs`, `roles`, `prisma` | Detail cards | Tailwind | Stacked mobile | MEDIUM | Preserve investigation data | file |
| `/dashboard/billing` | `src/app/dashboard/billing/page.tsx` | Business billing and plan page | Business Owner | `DashboardShell`, `InvoiceBadge`, UI | Plan summary, invoices, usage | None | `billing`, `business-owner`, `subscriptions`, `subscription-plans`, `prisma` | Tables/cards | Tailwind | Responsive billing cards/table | HIGH | Avoid billing logic changes | file |
| `/dashboard/branches` | `src/app/dashboard/branches/page.tsx` | Branch management | Business Owner | `DashboardShell`, `ConfirmSubmitButton`, `CsrfInput`, `StatusBadge` | Branch list/create/update forms | `dashboard/actions.ts` | `business-owner`, `platform-options`, `format` | Forms/list rows | Tailwind | Stacked forms mobile | HIGH | Preserve branch actions and CSRF | file + actions |
| `/dashboard/customers` | `src/app/dashboard/customers/page.tsx` | Customer directory | Business Owner | `DashboardShell`, UI | Search/filter, KPI cards, customer table/cards | None | `business-owner`, `customers`, `phone`, `format`, `prisma` | FilterBar, SearchBar, DataTable/cards | Tailwind, UI primitives | Desktop table/mobile cards | HIGH | Safe redesign around row/card layout only | file, UI table/filter/search components |
| `/dashboard/customers/new` | `src/app/dashboard/customers/new/page.tsx` | Create customer | Business Owner | `CustomerCreateForm`, `CsrfInput`, `DashboardShell`, `ReferralReferrerLookupPreview` | Create form | `dashboard/actions.ts` | `business-owner`, `prisma` | Customer form/referral lookup | Tailwind + shared form | Mobile form stack | HIGH | Preserve submitted values, referral validation, program selector | file + `CustomerCreateForm` + actions |
| `/dashboard/customers/[id]` | `src/app/dashboard/customers/[id]/page.tsx` | Customer 360 | Business Owner | `DashboardShell`, `CardShareActions`, `ConfirmSubmitButton`, `CopyButton`, `CsrfInput`, UI | Overview, card/share, progress, history, rewards/referrals, actions | `dashboard/actions.ts` | `business-owner`, `customer-cards`, `customer-tiers`, `customers`, `programs`, `scan`, `alert-*`, `phone`, `prisma` | Cards, forms, action menus, timeline | Tailwind + UI primitives | Dense responsive panels | HIGH | Redesign section layout carefully; preserve action forms | file, `CardShareActions`, UI, actions |
| `/dashboard/customers/[id]/edit` | `src/app/dashboard/customers/[id]/edit/page.tsx` | Edit customer | Business Owner | `DashboardShell`, `CsrfInput` | Edit form | `dashboard/actions.ts` | `business-owner`, `customers`, `phone` | Form | Tailwind | Mobile stack | HIGH | Preserve business-scoped customer update | file + actions |
| `/dashboard/engagement` | `src/app/dashboard/engagement/page.tsx` | Engagement campaigns/messages | Business Owner | `DashboardShell`, `MetricCard`, `EmptyState`, `SearchableCombobox` | Metrics, filter/list | None | `business-owner`, `engagement`, `format`, `prisma` | Form filters, table/list, cards | Tailwind | Responsive list | MEDIUM | Preserve message/customer targeting | file |
| `/dashboard/engagement/[id]` | `src/app/dashboard/engagement/[id]/page.tsx` | Engagement detail | Business Owner | `DashboardShell`, `CopyButton`, `CsrfInput` | Message detail/actions | `dashboard/messages/actions.ts` | `business-owner`, `engagement`, `format`, `prisma` | Forms/detail cards | Tailwind | Stacked mobile | MEDIUM | Preserve send/duplicate actions | file + actions |
| `/dashboard/exports/[type]` | `src/app/dashboard/exports/[type]/route.ts` | CSV export route | Business Owner | None | Route handler | None | `alert-labels`, `csv`, `format`, `prisma`, `session` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/dashboard/messages` | `src/app/dashboard/messages/page.tsx` | Business messages | Business Owner | `DashboardShell`, `EmptyState`, `MetricCard`, `SectionCard` | Metrics, messages list | None | `business-owner`, `engagement`, `messages`, `format`, `prisma` | Tables/cards/forms | Tailwind | Responsive list | MEDIUM | Preserve message state/actions | file |
| `/dashboard/messages/[id]` | `src/app/dashboard/messages/[id]/page.tsx` | Message detail | Business Owner | `DashboardShell`, `CopyButton`, `CsrfInput` | Message detail/actions | `dashboard/messages/actions.ts` | `business-owner`, `engagement`, `messages`, `format`, `prisma` | Forms/detail cards | Tailwind | Stacked mobile | MEDIUM | Preserve message action forms | file + actions |
| `/dashboard/notifications` | `src/app/dashboard/notifications/page.tsx` | Notifications/alert center | Business Owner | `DashboardShell`, `CsrfInput`, `EmptyState`, `MetricCard`, `SearchableCombobox`, UI tabs | Metrics, filters, tabs, alerts list | `dashboard/notifications/actions.ts` | `alert-engine`, `business-owner`, `alert-*`, `format`, `prisma` | Forms, cards, tabs | Tailwind + UI | Responsive tabs/list | HIGH | Preserve alert actions and statuses | file + actions |
| `/dashboard/notifications/[id]` | `src/app/dashboard/notifications/[id]/page.tsx` | Notification detail | Business Owner | `DashboardShell`, `CsrfInput` | Detail and action forms | `dashboard/notifications/actions.ts` | `business-owner`, `alert-*`, `format`, `prisma` | Forms/detail cards | Tailwind | Stacked mobile | MEDIUM | Preserve alert investigation workflow | file + actions |
| `/dashboard/profile` | `src/app/dashboard/profile/page.tsx` | Owner/business profile | Business Owner | `DashboardShell`, `CsrfInput`, `StatusBadge` | Profile/settings forms | `dashboard/actions.ts` | `business-owner`, `platform-options`, `roles`, `format` | Forms/cards | Tailwind | Mobile stack | MEDIUM | Preserve profile action names | file |
| `/dashboard/programs` | `src/app/dashboard/programs/page.tsx` | Programs directory/performance | Business Owner | `DashboardShell`, UI | Program metrics, filter/search, program table/cards | None | `business-owner`, `programs`, `roles`, `prisma` | DataTable/cards/forms | Tailwind + UI | Desktop table/mobile cards | HIGH | Preserve program detail/edit/design links | file, UI table components |
| `/dashboard/programs/new` | `src/app/dashboard/programs/new/page.tsx` | Create loyalty program | Business Owner | `DashboardShell`, `ProgramForm` | Create form | `dashboard/programs/actions.ts` | `business-owner`, `customer-cards`, `card-design` | Program form | Tailwind | Mobile form stack | HIGH | Preserve defaults and redirect to Design Studio | file + `ProgramForm` + actions |
| `/dashboard/programs/[id]` | `src/app/dashboard/programs/[id]/page.tsx` | Program details | Business Owner | `DashboardShell`, `ConfirmSubmitButton`, `CopyButton`, `CsrfInput`, UI | Overview, join QR, customers, actions | `dashboard/programs/actions.ts` | `business-owner`, `program-join`, `programs`, `roles`, `prisma` | Cards, tables, forms | Tailwind + UI | Responsive panels | HIGH | Preserve action routing and QR tools | file + actions |
| `/dashboard/programs/[id]/customers` | `src/app/dashboard/programs/[id]/customers/page.tsx` | Program enrollment/customer list | Business Owner | `DashboardShell`, `CsrfInput`, `SearchableCombobox`, UI | Enroll form and customer table | `dashboard/programs/actions.ts` | `business-owner`, `programs`, `format`, `prisma` | Form, table/cards | Tailwind + UI | Responsive table/cards | HIGH | Preserve enrollment action | file + actions |
| `/dashboard/programs/[id]/design-studio` | `src/app/dashboard/programs/[id]/design-studio/page.tsx` | Design Studio per program | Business Owner | `ProgramDesignStudioForm`, `DashboardShell`, UI | Header, preview, presets, editor sections | `dashboard/programs/actions.ts` | `business-owner`, `csrf`, `customer-cards`, `card-design`, `design-studio`, `prisma` | Large form/editor, cards, preview | Tailwind, business tokens | Two-column desktop, preview-first mobile | HIGH | UI-only redesign safe inside component; preserve save action/hidden values | file + `ProgramDesignStudioForm`, design libs |
| `/dashboard/programs/[id]/edit` | `src/app/dashboard/programs/[id]/edit/page.tsx` | Edit program | Business Owner | `DashboardShell`, `ProgramForm` | Edit form | `dashboard/programs/actions.ts` | `business-owner`, `customer-cards`, `prisma` | Program form | Tailwind | Mobile form stack | HIGH | Preserve rewards/program business rules | file + `ProgramForm` |
| `/dashboard/programs/[id]/join-poster` | `src/app/dashboard/programs/[id]/join-poster/page.tsx` | Printable join QR poster | Business Owner | `BusinessBrandingProvider`, `PrintPageButton` | Print poster | None | `business-owner`, `business-branding`, `program-join`, `prisma` | Poster/print button | Tailwind + print styles | Print/mobile centered | MEDIUM | Visual redesign safe if QR/link intact | file |
| `/dashboard/referrals` | `src/app/dashboard/referrals/page.tsx` | Referrals dashboard | Business Owner | `DashboardShell`, UI | Referral metrics/list | None | `business-owner`, `format`, `prisma` | Cards/list/filter | Tailwind + UI | Responsive cards/list | HIGH | Preserve referral statuses/rewards | file |
| `/dashboard/referrals/[id]` | `src/app/dashboard/referrals/[id]/page.tsx` | Referral detail | Business Owner | `DashboardShell` | Referral detail cards | None | `business-owner`, `format`, `prisma` | Cards | Tailwind | Stacked mobile | MEDIUM | Preserve referral data semantics | file |
| `/dashboard/scanner` | `src/app/dashboard/scanner/page.tsx` | Business Owner scanner landing | Business Owner | `CameraScanner`, `DashboardShell`, `ScannerManualCustomerSearch`, UI/layouts | Camera preview, manual search, referral scanner | None | `session` | Scanner cards/search form | Tailwind + `ScannerPageLayout` | Mobile-first scanner controls | HIGH | Do not change scanner behavior or route targets | file + scanner components |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Business settings | Business Owner | `DashboardShell`, `SettingsMobileSectionSelect`, `ConfirmSubmitButton`, `CsrfInput`, UI | Settings tabs/sections/forms | `dashboard/actions.ts`, `platform/businesses/support-actions` | `business-owner`, `customer-tiers`, `messages`, `subscriptions`, `roles`, `prisma` | Forms/cards/tabs | Tailwind + UI | Mobile section selector | HIGH | Preserve settings boundaries/actions | file + actions |
| `/dashboard/staff` | `src/app/dashboard/staff/page.tsx` | Staff management | Business Owner | `DashboardShell`, `SearchableCombobox`, `StaffPasswordResetAction`, `ConfirmSubmitButton`, `CsrfInput`, UI | Staff list/create/invite/actions | `dashboard/actions.ts` | `business-owner`, `csrf`, `roles`, `format`, `prisma` | Forms, table/cards, menus | Tailwind + UI | Responsive staff cards/table | HIGH | Preserve permissions and role options | file + actions |
| `/dashboard/staff/[id]` | `src/app/dashboard/staff/[id]/page.tsx` | Staff detail | Business Owner | `DashboardShell`, UI | Overview/activity/permissions | None | `business-owner`, `alert-*`, `roles`, `format`, `prisma` | Cards/timeline | Tailwind + UI | Stacked mobile | HIGH | Preserve permission display and action routing | file |
| `/dashboard/support-history` | `src/app/dashboard/support-history/page.tsx` | Business support history | Business Owner | `DashboardShell`, `CsrfInput`, UI | Support requests/history, WhatsApp support CTA | `platform/businesses/support-actions` | `business-owner`, `support-sessions`, `format`, `prisma` | Forms, tables/cards | Tailwind + UI | Floating WhatsApp CTA above mobile safe area | MEDIUM | Preserve support request actions | file + actions |

### Branch Manager Routes

| Route | Main file | Purpose | Role access | Imported components | Local sections/functions | Connected actions | Connected lib/data files | Tables/cards/forms/modals | Styling method | Mobile layout notes | Risk level when editing | Safe redesign notes | Files to send to external UI/UX AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/branch` | `src/app/branch/page.tsx` | Branch dashboard | Branch Manager | `DashboardShell`, `EmptyState`, `MetricCard` | KPIs/activity/quick actions | None | `session`, `prisma`, `format` | KPI cards/lists | Tailwind | Responsive cards | HIGH | Preserve branch scoping | file |
| `/branch/customers` | `src/app/branch/customers/page.tsx` | Branch customers | Branch Manager | `DashboardShell`, `CardShareActions`, `StatusBadge`, UI cards | Search/list/customer cards | None | `session`, `customers`, `customer-cards`, `programs`, `phone`, `prisma` | Forms, tables/cards | Tailwind | Mobile cards | HIGH | Preserve branch/customer scope | file |
| `/branch/customers/new` | `src/app/branch/customers/new/page.tsx` | Branch create customer | Branch Manager | `CustomerCreateForm`, `CsrfInput`, `DashboardShell`, `ReferralReferrerLookupPreview` | Create form | `branch/customers/actions.ts` | `session`, `prisma` | Form | Tailwind | Mobile stack | HIGH | Preserve branch attribution | file + actions |
| `/branch/customers/[id]` | `src/app/branch/customers/[id]/page.tsx` | Branch customer detail | Branch Manager | `DashboardShell`, `CardShareActions`, `StatusBadge`, UI | Profile/progress/history | None/action links | `session`, `customers`, `customer-cards`, `programs`, `scan`, `phone`, `prisma` | Cards/tables | Tailwind | Stacked mobile | HIGH | Preserve branch scope and card links | file |
| `/branch/programs` | `src/app/branch/programs/page.tsx` | Branch program view | Branch Manager | `DashboardShell`, `EmptyState`, `MetricCard`, `SectionCard` | Program list/KPIs | None | `session`, `programs`, `prisma` | Cards | Tailwind | Responsive grid | MEDIUM | View-only program UI | file |
| `/branch/programs/[id]` | `src/app/branch/programs/[id]/page.tsx` | Branch program detail | Branch Manager | `DashboardShell`, `CopyButton` | Program details/join QR | None | `session`, `programs`, `program-join`, `roles`, `prisma` | Tables/cards | Tailwind | Stacked mobile | MEDIUM | Preserve no-edit behavior | file |
| `/branch/programs/[id]/customers` | `src/app/branch/programs/[id]/customers/page.tsx` | Branch program customers/enrollment | Branch Manager | `DashboardShell`, `CsrfInput`, `SearchableCombobox`, UI | Enroll/search/customer list | `branch/programs/actions.ts` | `session`, `programs`, `format`, `prisma` | Forms/tables/cards | Tailwind + UI | Responsive | HIGH | Preserve branch scope | file + actions |
| `/branch/programs/[id]/join-poster` | `src/app/branch/programs/[id]/join-poster/page.tsx` | Branch printable join poster | Branch Manager | `BusinessBrandingProvider`, `PrintPageButton` | Print poster | None | `session`, `business-branding`, `program-join`, `prisma` | Poster | Tailwind/print | Print/mobile centered | MEDIUM | View/print only | file |
| `/branch/scanner` | `src/app/branch/scanner/page.tsx` | Branch scanner landing | Branch Manager | `CameraScanner`, `DashboardShell`, `ScannerManualCustomerSearch`, UI/layouts | Camera/manual/referral scanner | None | `session` | Scanner cards | Tailwind + scanner layout | Mobile-first | HIGH | Preserve scanner permission flow | file + scanner components |

### Staff Routes

| Route | Main file | Purpose | Role access | Imported components | Local sections/functions | Connected actions | Connected lib/data files | Tables/cards/forms/modals | Styling method | Mobile layout notes | Risk level when editing | Safe redesign notes | Files to send to external UI/UX AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/staff` | `src/app/staff/page.tsx` | Staff dashboard | Staff | `DashboardShell`, `EmptyState`, `MetricCard` | KPIs/quick actions | None | `session`, `format`, `prisma` | Cards | Tailwind | Mobile cards | HIGH | Preserve limited staff scope | file |
| `/staff/customers` | `src/app/staff/customers/page.tsx` | Staff customer search/list | Staff | `DashboardShell`, `StatusBadge` | Search/list cards | None | `session`, `customer-cards`, `programs`, `phone`, `prisma` | Forms/cards | Tailwind | Mobile-first cards | HIGH | Preserve business-wide search but branch-limited actions | file |
| `/staff/customers/new` | `src/app/staff/customers/new/page.tsx` | Staff create customer | Staff | `CustomerCreateForm`, `CsrfInput`, `DashboardShell`, `ReferralReferrerLookupPreview` | Create form | `staff/customers/actions.ts` | `session`, `prisma` | Form | Tailwind | Mobile stack | HIGH | Preserve branch attribution and program enrollment limits | file + actions |
| `/staff/customers/success` | `src/app/staff/customers/success/page.tsx` | Staff customer creation success/share | Staff | `CardShareActions`, `DashboardShell` | Success card/share actions | None | `session`, `customer-cards`, `prisma` | Cards/share buttons | Tailwind | Stacked mobile | MEDIUM | Preserve card URL/share data | file |
| `/staff/customers/[id]` | `src/app/staff/customers/[id]/page.tsx` | Staff customer detail | Staff | `DashboardShell`, `CardShareActions`, `StatusBadge` | Profile/progress/share | None | `session`, `customer-cards`, `programs`, `phone`, `prisma` | Cards | Tailwind | Stacked mobile | HIGH | Preserve action restrictions | file |
| `/staff/programs` | `src/app/staff/programs/page.tsx` | Staff program list | Staff | `DashboardShell`, `EmptyState`, `SectionCard` | View-only programs | None | `session`, `programs`, `prisma` | Cards | Tailwind | Responsive cards | MEDIUM | Preserve no management actions | file |
| `/staff/scanner` | `src/app/staff/scanner/page.tsx` | Staff scanner landing | Staff | `CameraScanner`, `DashboardShell`, `ScannerManualCustomerSearch`, UI/layouts | Camera/manual/referral scanner | None | `session` | Scanner cards | Tailwind + scanner layout | Mobile-first | HIGH | Preserve scanner action permissions | file + scanner components |

### System Administrator Platform Routes

| Route | Main file | Purpose | Role access | Imported components | Local sections/functions | Connected actions | Connected lib/data files | Tables/cards/forms/modals | Styling method | Mobile layout notes | Risk level when editing | Safe redesign notes | Files to send to external UI/UX AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/platform` | `src/app/platform/page.tsx` | System Admin dashboard | System Administrator | `DashboardShell`, `PlatformKpiGrid`, `PlatformCards` | KPIs/cards | None | `session`, `roles`, `format`, `prisma` | KPI/cards | Tailwind | Responsive grid | HIGH | Preserve platform-only access | file + platform components |
| `/platform/audit-center` | `src/app/platform/audit-center/page.tsx` | Audit center | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `PlatformKpiGrid`, `SearchableCombobox`, UI | Filters, KPIs, audit list | Export route links | `session`, `roles`, `format`, `prisma` | Forms, tables/cards | Tailwind + UI | Mobile filter drawer | HIGH | Preserve audit filters/export links | file |
| `/platform/audit-center/export` | `src/app/platform/audit-center/export/route.ts` | Audit export route | System Administrator | None | Route handler | None | `export-files`, `format`, `roles`, `session`, `prisma` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/platform/billing-center` | `src/app/platform/billing-center/page.tsx` | Billing center | System Administrator | `DashboardShell`, `MobileAccordionSection`, `MobileFilterDrawer`, `PlatformKpiGrid`, `SearchableCombobox`, UI | Billing filters/KPIs/lists | Export route links | `billing`, `subscriptions`, `subscription-plans`, `session`, `prisma` | Tables/cards/forms/tabs | Tailwind + UI | Mobile accordions/drawer | HIGH | Preserve billing data/actions | file |
| `/platform/billing-center/export` | `src/app/platform/billing-center/export/route.ts` | Billing export route | System Administrator | None | Route handler | None | `export-files`, `billing`, `subscriptions`, `subscription-plans`, `session`, `prisma` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/platform/businesses` | `src/app/platform/businesses/page.tsx` | Business directory | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `SearchableCombobox`, `StatusBadge`, UI | Filters/table/cards | None | `session`, `roles`, `format`, `prisma` | Search/filter/table/cards | Tailwind + UI | Mobile filters/cards | HIGH | Preserve row navigation/filtering | file |
| `/platform/businesses/new` | `src/app/platform/businesses/new/page.tsx` | Create business | System Administrator | `BusinessForm`, `CsrfInput`, `DashboardShell` | Business form | `platform/businesses/actions.ts` | `session`, `prisma` | Form | Tailwind | Mobile stack | HIGH | Preserve create action/default branding | file + `BusinessForm` + actions |
| `/platform/businesses/[id]` | `src/app/platform/businesses/[id]/page.tsx` | Business detail | System Administrator | `DashboardShell`, `ConfirmSubmitButton`, `CsrfInput`, `StatusBadge` | Overview, subscription, actions | `platform/businesses/actions.ts`, `platform/subscriptions/actions.ts` | `session`, `roles`, `billing`, `subscriptions`, `subscription-plans`, `format`, `prisma` | Cards, tables, action forms | Tailwind | Responsive detail layout | HIGH | Preserve admin-only actions | file + actions |
| `/platform/businesses/[id]/edit` | `src/app/platform/businesses/[id]/edit/page.tsx` | Edit business | System Administrator | `BusinessForm`, `CsrfInput`, `DashboardShell` | Edit form | `platform/businesses/actions.ts` | `session`, `prisma` | Form | Tailwind | Mobile stack | HIGH | Preserve update action/branding fields | file + `BusinessForm` |
| `/platform/businesses/[id]/support-session` | `src/app/platform/businesses/[id]/support-session/page.tsx` | Business support session detail | System Administrator | `DashboardShell`, `CsrfInput`, `SupportCountdown` | Support session controls | `platform/businesses/support-actions.ts` | `session`, `format`, `prisma` | Forms/status cards | Tailwind | Stacked mobile | HIGH | Preserve support permission flow | file + support actions |
| `/platform/database` | `src/app/platform/database/page.tsx` | Database health | System Administrator | `DashboardShell`, `PlatformKpiGrid` | Health KPIs/details | None | `database-health`, `session` | KPI/cards | Tailwind | Responsive grid | MEDIUM | UI safe if health semantics intact | file |
| `/platform/health-analytics` | `src/app/platform/health-analytics/page.tsx` | Platform health analytics | System Administrator | `DashboardShell`, `MobileAccordionSection`, `PlatformKpiGrid` | Health tables/cards | Export route links | `database-health`, `format`, `session`, `prisma` | Tables/cards | Tailwind | Mobile accordions | MEDIUM | Preserve metrics names | file |
| `/platform/health-analytics/export` | `src/app/platform/health-analytics/export/route.ts` | Health export route | System Administrator | None | Route handler | None | `export-files`, `database-health`, `session`, `prisma` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/platform/invoices` | `src/app/platform/invoices/page.tsx` | Invoice management | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `InvoiceBadge`, `SearchableCombobox`, UI | Filters/table/action forms | `platform/invoices/actions.ts` | `billing`, `session`, `format`, `prisma` | Forms, table/cards | Tailwind + UI | Mobile filter drawer | HIGH | Preserve invoice actions | file + actions |
| `/platform/invoices/[id]` | `src/app/platform/invoices/[id]/page.tsx` | Invoice detail | System Administrator | `DashboardShell`, `ConfirmSubmitButton`, `CsrfInput`, `InvoiceBadge` | Invoice overview/actions | `platform/invoices/actions.ts` | `billing`, `session`, `format`, `prisma` | Forms/tables | Tailwind | Stacked mobile | HIGH | Preserve billing actions | file + actions |
| `/platform/launch-readiness` | `src/app/platform/launch-readiness/page.tsx` | Launch readiness report | System Administrator | `DashboardShell` | Readiness tables/sections | None | `session`, `prisma` | Tables | Tailwind | Responsive tables | MEDIUM | UI-only safe | file |
| `/platform/operations-center` | `src/app/platform/operations-center/page.tsx` | Operations Center monitoring | System Administrator | `DashboardShell`, `SupportCountdown`, UI | KPIs, pending requests, active sessions, mobile lite | Support action links/forms | `support-sessions`, `format`, `session`, `prisma` | Forms/cards/dashboard | Tailwind + UI | Desktop full center, mobile lite | HIGH | Preserve support workflow/route links | file + support detail pages |
| `/platform/operations-center/requests/[id]` | `src/app/platform/operations-center/requests/[id]/page.tsx` | Support request detail | System Administrator | `DashboardShell`, `CsrfInput`, `SupportCountdown`, `TerminateSupportSessionButton`, UI | Request info/session/actions | `platform/businesses/support-actions.ts` | `support-sessions`, `format`, `session`, `prisma` | Forms/cards | Tailwind + UI | Stacked mobile | HIGH | Preserve action visibility/state | file + support actions |
| `/platform/operations-center/support/start` | `src/app/platform/operations-center/support/start/page.tsx` | Start support session | System Administrator | `DashboardShell`, `CsrfInput`, `SupportCountdown`, UI | Start form/context | `platform/businesses/support-actions.ts` | `support-sessions`, `format`, `session`, `prisma` | Forms/cards | Tailwind + UI | Mobile stack | HIGH | Preserve mode/business selection | file |
| `/platform/operations-center/support/[id]` | `src/app/platform/operations-center/support/[id]/page.tsx` | Support session detail | System Administrator | `DashboardShell`, `CsrfInput`, `SupportCountdown`, `TerminateSupportSessionButton`, UI | Session info/actions/logs | `platform/businesses/support-actions.ts` | `support-sessions`, `format`, `session`, `prisma` | Forms/cards | Tailwind + UI | Mobile stack | HIGH | Preserve support session actions | file |
| `/platform/plans` | `src/app/platform/plans/page.tsx` | Platform plan management/list | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `PlatformKpiGrid` | Plan table/cards | None | `subscription-plans`, `session`, `prisma` | Forms/tables/cards | Tailwind | Mobile filters | HIGH | Preserve plan display/actions | file |
| `/platform/settings` | `src/app/platform/settings/page.tsx` | Platform settings | System Administrator | `DashboardShell`, `MobileTabSelector`, `CsrfInput` | Settings tabs/forms | `platform/settings/actions.ts` | `platform-settings`, `format`, `session`, `prisma`, `package.json` | Forms/tables/cards/tabs | Tailwind | Mobile tab selector | HIGH | Preserve settings keys/actions | file + actions |
| `/platform/subscriptions` | `src/app/platform/subscriptions/page.tsx` | Subscription directory/details | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `PlatformKpiGrid`, `SearchableCombobox`, `StatusBadge`, UI | Filters, table, selected detail/actions | `platform/subscriptions/actions.ts` | `subscriptions`, `subscription-plans`, `session`, `format`, `prisma` | Forms, table/cards | Tailwind + UI | Mobile filters/cards | HIGH | Preserve lifecycle actions | file + actions |
| `/platform/tenant-center` | `src/app/platform/tenant-center/page.tsx` | Tenant center | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `PlatformKpiGrid`, `SearchableCombobox` | Tenant filters/KPIs/list | Export links | `roles`, `session`, `format`, `prisma` | Forms/tables/cards | Tailwind | Mobile filter drawer | HIGH | Preserve tenant isolation/admin visibility | file |
| `/platform/tenant-center/export` | `src/app/platform/tenant-center/export/route.ts` | Tenant export route | System Administrator | None | Route handler | None | `export-files`, `roles`, `session`, `format`, `prisma` | No UI | N/A | N/A | HIGH | Not UI material | Not UI AI material |
| `/platform/users` | `src/app/platform/users/page.tsx` | Platform users directory | System Administrator | `DashboardShell`, `MobileFilterDrawer`, `SearchableCombobox`, `StatusBadge`, UI | Filters/table/cards row nav | `platform/users/actions.ts` indirectly | `roles`, `session`, `format`, `prisma` | Forms/table/cards | Tailwind + UI | Mobile cards/no horizontal overflow | HIGH | Preserve row navigation and filters | file + user detail/edit pages |
| `/platform/users/[id]` | `src/app/platform/users/[id]/page.tsx` | Platform user detail | System Administrator | `DashboardShell`, `PlatformUserPasswordResetAction`, `ConfirmSubmitButton`, `CsrfInput`, `StatusBadge` | Overview, account, security, audit, actions | `platform/users/actions.ts` | `roles`, `csrf`, `session`, `format`, `prisma` | Forms/action panel/cards | Tailwind | Stacked mobile | HIGH | Preserve admin-only user lifecycle actions | file + actions |
| `/platform/users/[id]/edit` | `src/app/platform/users/[id]/edit/page.tsx` | Platform user edit | System Administrator | `DashboardShell`, `CsrfInput` | Edit form | `platform/users/actions.ts` | `roles`, `session`, `prisma` | Form | Tailwind | Mobile stack | HIGH | Preserve role/business assignment validation | file + actions |

## Component Map

Risk and global impact are based on verified usage count from `src`. Components imported by multiple pages are marked higher impact.

| Component | File | Used by | Purpose | Risk level | Global impact | Safe editing notes |
|---|---|---|---|---|---|---|
| AppToaster | `src/components/AppToaster.tsx` | `src/app/layout.tsx` | Global toast host | MEDIUM | HIGH | Visual/toast positioning only; affects all pages |
| BranchLocationFields | `src/components/BranchLocationFields.tsx` | `BusinessForm` | Branch fields inside business form | MEDIUM | MEDIUM | Preserve field names and validation bindings |
| BusinessBrandingProvider | `src/components/BusinessBrandingProvider.tsx` | Dashboard shell, join/poster/referral pages | CSS business theme token provider | HIGH | HIGH | Token changes affect many branded views |
| BusinessForm | `src/components/BusinessForm.tsx` | Platform business create/edit | System admin business form | HIGH | MEDIUM | Preserve action fields and defaults |
| CameraScanner | `src/components/CameraScanner.tsx` | Owner/branch/staff scanner pages | Camera QR scanner | HIGH | HIGH | Do not alter scanner callbacks without tests |
| CardShareActions | `src/components/CardShareActions.tsx` | Customer detail, public card, staff/branch customer pages | Copy/share/WhatsApp card actions | HIGH | HIGH | Preserve generated URLs and phone handling |
| CardThemePreviewSelector | `src/components/CardThemePreviewSelector.tsx` | `ProgramForm` | Legacy card theme selector/preview | MEDIUM | LOW | Check create/edit visibility before redesign |
| ChangePasswordForm | `src/components/ChangePasswordForm.tsx` | `/change-password` | Password change form | HIGH | LOW | Preserve password clearing/security |
| ConfirmSubmitButton | `src/components/ConfirmSubmitButton.tsx` | Many action forms | Confirmation submit UX | HIGH | HIGH | Shared destructive/action confirmation |
| CopyButton | `src/components/CopyButton.tsx` | Program/customer/message pages | Clipboard button | MEDIUM | HIGH | UI safe; preserve clipboard fallback |
| CsrfInput | `src/components/CsrfInput.tsx` | 33 form pages | CSRF hidden input | HIGH | HIGH | Do not redesign into non-input |
| CustomerCreateForm | `src/components/CustomerCreateForm.tsx` | Owner/branch/staff create customer pages | Shared create customer form | HIGH | HIGH | Preserve form state, referral lookup, program selection |
| DashboardShell | `src/components/DashboardShell.tsx` | 69 authenticated pages | Authenticated layout/nav/header | HIGH | HIGH | Any edit affects all role dashboards |
| DemoRequestForm | `src/components/DemoRequestForm.tsx` | `/request-demo` | Marketing request demo form | MEDIUM | LOW | Preserve submit behavior |
| ForgotPasswordForm | `src/components/ForgotPasswordForm.tsx` | `/forgot-password` | Password reset request form | MEDIUM | LOW | Preserve CSRF and success messaging |
| HomepageLoyaltyCardDemo | `src/components/HomepageLoyaltyCardDemo.tsx` | No verified direct import | Homepage/demo visual component | LOW | LOW | Suspicious unused component; verify before deleting |
| HomepageMotion | `src/components/HomepageMotion.tsx` | `/` | Homepage motion/client effects | MEDIUM | LOW | Keep reduced motion behavior |
| IdempotencyInput | `src/components/IdempotencyInput.tsx` | `/scan/[token]` | Hidden idempotency token input | HIGH | MEDIUM | Do not remove from stamp/redeem forms |
| IdleSessionTimeout | `src/components/IdleSessionTimeout.tsx` | `DashboardShell` | Idle timeout UX | HIGH | HIGH | Auth/session-sensitive |
| InvoiceBadge | `src/components/InvoiceBadge.tsx` | Billing/invoice pages | Invoice status badge | MEDIUM | MEDIUM | Preserve status mapping |
| LoginForm | `src/components/LoginForm.tsx` | `/login` | Login form | HIGH | LOW | Preserve auth fields/errors |
| MobileAccordionSection | `src/components/MobileAccordionSection.tsx` | Platform billing/health pages | Mobile collapsible section | MEDIUM | MEDIUM | Safe visual edits with keyboard checks |
| MobileFilterDrawer | `src/components/MobileFilterDrawer.tsx` | 8 platform list pages | Mobile filters drawer | HIGH | HIGH | Preserve filter form submission |
| MobileTabSelector | `src/components/MobileTabSelector.tsx` | Platform settings | Mobile tab selector | MEDIUM | LOW | Preserve active tab state |
| PlanBillingCycleFields | `src/components/PlanBillingCycleFields.tsx` | `BusinessForm` | Plan billing fields | HIGH | MEDIUM | Billing-sensitive form fields |
| PlatformCards | `src/components/PlatformCards.tsx` | Platform dashboard | Admin dashboard cards | MEDIUM | LOW | UI safe |
| PlatformKpiGrid | `src/components/PlatformKpiGrid.tsx` | 8 platform pages | KPI grid | HIGH | HIGH | Shared platform dashboard/list metric layout |
| PlatformUserPasswordResetAction | `src/components/PlatformUserPasswordResetAction.tsx` | Platform user detail | Admin password reset action | HIGH | MEDIUM | Preserve action form/security |
| PrintPageButton | `src/components/PrintPageButton.tsx` | Join poster pages | Print button | LOW | MEDIUM | UI safe |
| ProgramDesignStudioForm | `src/components/ProgramDesignStudioForm.tsx` | Design Studio page | Large Design Studio editor/preview | HIGH | MEDIUM | High complexity; preserve state/save hidden fields |
| ProgramForm | `src/components/ProgramForm.tsx` | Program create/edit | Program form | HIGH | HIGH | Preserve reward/program/businessType/default design fields |
| ReferralInviteActions | `src/components/ReferralInviteActions.tsx` | Public referral page | Referral invite/share actions | HIGH | LOW | Preserve referral code and contact logic |
| ReferralReferrerLookupPreview | `src/components/ReferralReferrerLookupPreview.tsx` | Customer create forms | Referrer validation/search UI | HIGH | HIGH | Preserve tenant-scoped lookup |
| ReferralShareActions | `src/components/ReferralShareActions.tsx` | `ReferralPanel` | Public card referral share actions | HIGH | MEDIUM | Preserve share URLs |
| ResetPasswordForm | `src/components/ResetPasswordForm.tsx` | `/reset-password` | Reset password form | HIGH | LOW | Preserve token/password handling |
| RoleNavigation | `src/components/RoleNavigation.tsx` | `DashboardShell` | Role-specific navigation config/UI | HIGH | HIGH | Navigation changes affect all roles |
| SaveCardImageButton | `src/components/SaveCardImageButton.tsx` | Public card page | Download card images | HIGH | MEDIUM | Export rendering/QR-sensitive |
| ScannerManualCustomerSearch | `src/components/ScannerManualCustomerSearch.tsx` | Owner/branch/staff scanners | Manual scanner search | HIGH | HIGH | Preserve business/branch search behavior |
| ScannerSoundFeedback | `src/components/ScannerSoundFeedback.tsx` | Scan result page | Scanner sound status | LOW | LOW | UI safe |
| SearchableCombobox | `src/components/SearchableCombobox.tsx` | 14 pages/forms | Searchable select | HIGH | HIGH | Shared form accessibility/search behavior |
| SettingsMobileSectionSelect | `src/components/SettingsMobileSectionSelect.tsx` | Owner settings | Mobile settings selector | MEDIUM | LOW | Preserve section anchors/state |
| StaffPasswordResetAction | `src/components/StaffPasswordResetAction.tsx` | Owner staff page | Staff reset action | HIGH | MEDIUM | Preserve action form |
| StampWhatsAppSharePrompt | `src/components/StampWhatsAppSharePrompt.tsx` | Scan result page | Post-stamp WhatsApp share prompt | HIGH | MEDIUM | Preserve wa.me message behavior |
| StatusBadge | `src/components/StatusBadge.tsx` | 38 pages/components | Root status badge | HIGH | HIGH | Duplicate name with `ui/StatusBadge`; edit carefully |
| SupportActivityTracker | `src/components/SupportActivityTracker.tsx` | `DashboardShell` | Support session activity tracking | HIGH | HIGH | Support audit-sensitive |
| SupportCountdown | `src/components/SupportCountdown.tsx` | Support pages/banner | Support countdown | MEDIUM | HIGH | Keep time calculations/display accurate |
| SupportEndSessionButton | `src/components/SupportEndSessionButton.tsx` | `DashboardShell` | End support session button | HIGH | HIGH | Preserve action |
| SupportModeBanner | `src/components/SupportModeBanner.tsx` | `DashboardShell` | Active support mode banner | HIGH | HIGH | Support/audit-sensitive |
| TerminateSupportSessionButton | `src/components/TerminateSupportSessionButton.tsx` | Operations detail pages | Terminate support session action | HIGH | MEDIUM | Preserve state/action |
| BusinessStatusBadge | `src/components/domain/BusinessStatusBadge.tsx` | Domain barrel | Business status badge | MEDIUM | LOW | Check barrel consumers |
| CardQrTools | `src/components/domain/CardQrTools.tsx` | Domain barrel | QR tool display | MEDIUM | LOW | Preserve QR semantics |
| CustomerSummaryCard | `src/components/domain/CustomerSummaryCard.tsx` | Domain barrel | Customer summary card | MEDIUM | LOW | Check consumers through barrel |
| PlanUsageCard | `src/components/domain/PlanUsageCard.tsx` | Domain barrel | Plan usage display | MEDIUM | LOW | Preserve plan labels |
| ProgramProgressCard | `src/components/domain/ProgramProgressCard.tsx` | Domain barrel | Program progress display | MEDIUM | LOW | Preserve progress data |
| ReferralStatusBadge | `src/components/domain/ReferralStatusBadge.tsx` | Domain barrel | Referral status badge | MEDIUM | LOW | Preserve status mapping |
| ScannerResultCard | `src/components/domain/ScannerResultCard.tsx` | Scan token page/domain barrel | Scanner result card | HIGH | MEDIUM | Scanner operational UI |
| StaffActionButtons | `src/components/domain/StaffActionButtons.tsx` | Domain barrel | Staff action buttons | MEDIUM | LOW | Verify consumers through barrel |
| domain index | `src/components/domain/index.ts` | Barrel imports | Domain component exports | MEDIUM | HIGH | Export-only; do not remove without import audit |
| DashboardPageLayout | `src/components/layouts/DashboardPageLayout.tsx` | Dashboard page/layout barrel | Dashboard page wrapper | HIGH | MEDIUM | Layout affects dashboard pages using it |
| DetailPageLayout | `src/components/layouts/DetailPageLayout.tsx` | Scan page/layout barrel | Detail wrapper | MEDIUM | MEDIUM | UI safe |
| ManagementPageLayout | `src/components/layouts/ManagementPageLayout.tsx` | Layout barrel | Management wrapper | LOW | LOW | Verify active use before edits |
| PublicCardLayout | `src/components/layouts/PublicCardLayout.tsx` | Layout barrel | Public card wrapper | MEDIUM | LOW | Verify active use |
| ScannerPageLayout | `src/components/layouts/ScannerPageLayout.tsx` | Scanner pages/layout barrel | Scanner page wrapper | HIGH | MEDIUM | Affects all scanner landing pages |
| SettingsPageLayout | `src/components/layouts/SettingsPageLayout.tsx` | Layout barrel | Settings wrapper | MEDIUM | LOW | Verify active use |
| layouts index | `src/components/layouts/index.ts` | Barrel imports | Layout exports | MEDIUM | HIGH | Export-only |
| MarketingLayout | `src/components/marketing/MarketingLayout.tsx` | 8 marketing pages | Public marketing nav/footer shell | HIGH | HIGH | Public nav/footer impact |
| LoyaltyCardBackExport | `src/components/public-card/LoyaltyCardBackExport.tsx` | Public card/export barrel | Back export renderer | HIGH | MEDIUM | Export/QR-sensitive |
| LoyaltyCardExport | `src/components/public-card/LoyaltyCardExport.tsx` | Public-card barrel | Legacy/full export wrapper | MEDIUM | LOW | Verify before large changes |
| LoyaltyCardFrontExport | `src/components/public-card/LoyaltyCardFrontExport.tsx` | Public card/export barrel | Front export renderer | HIGH | MEDIUM | Export visual parity |
| LoyaltyProgressPanel | `src/components/public-card/LoyaltyProgressPanel.tsx` | Public-card barrel | Progress panel | HIGH | LOW | Card visual logic |
| LoyaltyWalletCard | `src/components/public-card/LoyaltyWalletCard.tsx` | Public card, previews, exports | Main customer wallet card | HIGH | HIGH | Customer-facing card renderer |
| ProgramRewardCard | `src/components/public-card/ProgramRewardCard.tsx` | Public card | Program reward section | HIGH | MEDIUM | Customer-facing reward copy |
| ReferralPanel | `src/components/public-card/ReferralPanel.tsx` | Public card | Referral section | HIGH | MEDIUM | Referral/share behavior |
| TierStatusPanel | `src/components/public-card/TierStatusPanel.tsx` | Public card | Tier status section | HIGH | MEDIUM | Tier display only |
| WalletCardShell | `src/components/public-card/WalletCardShell.tsx` | Public-card renderers | Shared wallet shell/frame | HIGH | HIGH | Affects live and exported cards |
| public-card index | `src/components/public-card/index.ts` | Barrel imports | Public-card exports | MEDIUM | HIGH | Export-only |
| ActionMenu | `src/components/ui/ActionMenu.tsx` | Customer 360, staff page, UI barrel | Dropdown actions | HIGH | MEDIUM | Accessibility and action menu behavior |
| Avatar | `src/components/ui/Avatar.tsx` | Domain card/UI barrel | Avatar primitive | LOW | MEDIUM | UI safe |
| Button | `src/components/ui/Button.tsx` | 41 files | Shared button primitive | HIGH | HIGH | Critical shared UI/brand tokens |
| Card | `src/components/ui/Card.tsx` | 78 files | Shared card primitive | HIGH | HIGH | Global visual impact |
| ConfirmationDialog | `src/components/ui/ConfirmationDialog.tsx` | Confirm button/UI barrel | Confirmation modal | HIGH | MEDIUM | Destructive action UX |
| DataTable | `src/components/ui/DataTable.tsx` | 7 tables | Shared data table | HIGH | HIGH | Affects key dashboards |
| EmptyState | `src/components/ui/EmptyState.tsx` | 35 files | Shared empty state | MEDIUM | HIGH | Global copy/layout impact |
| FilterBar | `src/components/ui/FilterBar.tsx` | 4 list pages | Shared filter wrapper | HIGH | MEDIUM | Must avoid nested forms |
| IconButton | `src/components/ui/IconButton.tsx` | UI barrel | Icon button primitive | MEDIUM | LOW | UI safe but shared |
| LoadingSkeleton | `src/components/ui/LoadingSkeleton.tsx` | UI barrel | Skeleton primitive | LOW | LOW | UI safe |
| MetricCard | `src/components/ui/MetricCard.tsx` | 27 files | Shared KPI card | HIGH | HIGH | Dashboard visual impact |
| PageActions | `src/components/ui/PageActions.tsx` | 8 pages | Page header actions wrapper | HIGH | HIGH | Header/action layout impact |
| PageHeader | `src/components/ui/PageHeader.tsx` | Dashboard pages/UI barrel | Page title component | HIGH | MEDIUM | Avoid duplicate heading regressions |
| PageIntro | `src/components/ui/PageIntro.tsx` | 13 pages | Page intro/title copy | HIGH | HIGH | Global page hierarchy |
| ProgressBar | `src/components/ui/ProgressBar.tsx` | 12 pages | Shared progress bar | HIGH | HIGH | Progress display across card/program/billing |
| SearchBar | `src/components/ui/SearchBar.tsx` | 4 list pages | Shared search input | HIGH | MEDIUM | Preserve query names/form behavior |
| SectionCard | `src/components/ui/SectionCard.tsx` | 29 files | Shared section card | HIGH | HIGH | Global spacing/card style |
| ui StatusBadge | `src/components/ui/StatusBadge.tsx` | 37 files | UI status badge | HIGH | HIGH | Duplicate name with root badge |
| Tabs | `src/components/ui/Tabs.tsx` | 5 pages | Shared tabs | HIGH | HIGH | Accessibility/state impact |
| Timeline | `src/components/ui/Timeline.tsx` | 7 pages | Shared timeline | MEDIUM | HIGH | Activity/audit display |
| Tooltip | `src/components/ui/Tooltip.tsx` | UI barrel | Tooltip primitive | LOW | LOW | UI safe |
| ui index | `src/components/ui/index.ts` | Barrel imports | UI exports | MEDIUM | HIGH | Export-only |
| styles | `src/components/ui/styles.ts` | 6 UI components | Shared UI class maps | HIGH | HIGH | Design-system impact |
| utils | `src/components/ui/utils.ts` | 26 components | UI utility helpers/classes | HIGH | HIGH | Design-system impact |

## Important Page Section Maps

### Public Homepage

- Section name: Marketing shell/navigation/footer. Where defined: `src/components/marketing/MarketingLayout.tsx`. Component/local function: `MarketingLayout`. Can external AI redesign safely? Yes, if links remain real. Notes: HIGH impact for all marketing pages.
- Section name: Homepage content sections. Where defined: `src/app/page.tsx`. Component/local function: local JSX sections plus `HomepageMotion`. Can external AI redesign safely? Yes. Notes: Root file is public homepage, not dashboard.
- Section name: Motion/client effects. Where defined: `src/components/HomepageMotion.tsx`. Can external AI redesign safely? Yes with reduced-motion check.

### Login Page

- Section name: Auth page shell. Where defined: `src/app/login/page.tsx`. Component/local function: page JSX. Can external AI redesign safely? Yes. Notes: Preserve redirect/session checks.
- Section name: Login form. Where defined: `src/components/LoginForm.tsx`. Can external AI redesign safely? Limited. Notes: Keep field names, CSRF, errors, submit action.

### System Administrator Dashboard

- Section name: Authenticated platform shell/nav. Where defined: `src/components/DashboardShell.tsx` and `src/components/RoleNavigation.tsx`. Can external AI redesign safely? Carefully. Notes: HIGH impact across all roles.
- Section name: Platform KPI grid. Where defined: `src/app/platform/page.tsx`, `src/components/PlatformKpiGrid.tsx`. Can external AI redesign safely? Yes if metric data unchanged.
- Section name: Platform action cards. Where defined: `src/components/PlatformCards.tsx`. Can external AI redesign safely? Yes.

### Business Owner Dashboard

- Section name: Dashboard wrapper/header. Where defined: `src/app/dashboard/page.tsx`, `DashboardShell`, `DashboardPageLayout`. Can external AI redesign safely? Yes with layout-only scope.
- Section name: KPI cards. Where defined: `src/app/dashboard/page.tsx`, `MetricCard`. Can external AI redesign safely? Yes; shared primitive is HIGH impact.
- Section name: Quick actions/support card. Where defined: `src/app/dashboard/page.tsx`. Can external AI redesign safely? Yes if action forms/links preserved.
- Section name: Activity/timeline panels. Where defined: `src/app/dashboard/page.tsx`, `Timeline`. Can external AI redesign safely? Yes.

### Customer 360 Page

- Section name: Customer header/overview. Where defined: `src/app/dashboard/customers/[id]/page.tsx`. Can external AI redesign safely? Yes with data/actions preserved.
- Section name: Loyalty progress/rewards. Where defined: same page plus `ProgressBar`. Can external AI redesign safely? Visual only.
- Section name: Card/share actions. Where defined: same page plus `CardShareActions`, `CopyButton`. Can external AI redesign safely? Limited; preserve generated URLs.
- Section name: Activity/audit timeline. Where defined: same page plus `Timeline`. Can external AI redesign safely? Yes.
- Section name: Action forms. Where defined: same page plus `ConfirmSubmitButton`, `CsrfInput`, `dashboard/actions.ts`. Can external AI redesign safely? No without engineering review.

### Customers Page

- Section name: Page header/actions. Where defined: `src/app/dashboard/customers/page.tsx`, `PageIntro`, `PageActions`. Can external AI redesign safely? Yes.
- Section name: Search/filter bar. Where defined: same page, `SearchBar`, `FilterBar`. Can external AI redesign safely? Yes if form behavior preserved.
- Section name: Customer table/cards. Where defined: same page, `DataTable`/UI cards. Can external AI redesign safely? Yes; preserve row navigation and pagination/filtering.
- Section name: KPI/empty states. Where defined: same page, `MetricCard`, `EmptyState`. Can external AI redesign safely? Yes.

### Programs Page

- Section name: Program performance/list. Where defined: `src/app/dashboard/programs/page.tsx`, `DataTable`, UI cards. Can external AI redesign safely? Yes; preserve program name links.
- Section name: Program filters/search. Where defined: same page, UI search/filter primitives. Can external AI redesign safely? Yes.
- Section name: Create/design links. Where defined: same page and program detail files. Can external AI redesign safely? Preserve routes.

### Referrals Page

- Section name: Referral metrics. Where defined: `src/app/dashboard/referrals/page.tsx`, UI/MetricCard usage. Can external AI redesign safely? Yes.
- Section name: Referral list/details link. Where defined: same page. Can external AI redesign safely? Yes if statuses/reward data unchanged.

### Staff Page

- Section name: Staff directory. Where defined: `src/app/dashboard/staff/page.tsx`, `DataTable`, `SearchableCombobox`. Can external AI redesign safely? Yes.
- Section name: Staff create/edit actions. Where defined: same page, `ConfirmSubmitButton`, `CsrfInput`, `dashboard/actions.ts`. Can external AI redesign safely? Limited; preserve actions and roles.
- Section name: Staff password reset. Where defined: `StaffPasswordResetAction`. Can external AI redesign safely? Visual only.

### Branches Page

- Section name: Branch list/cards. Where defined: `src/app/dashboard/branches/page.tsx`. Can external AI redesign safely? Yes.
- Section name: Branch forms/actions. Where defined: same page, `ConfirmSubmitButton`, `CsrfInput`, `dashboard/actions.ts`. Can external AI redesign safely? Limited.

### Scanner Page

- Section name: Scanner landing wrapper. Where defined: `src/app/dashboard/scanner/page.tsx`, `ScannerPageLayout`. Can external AI redesign safely? Yes if scanner props unchanged.
- Section name: Camera preview. Where defined: `src/components/CameraScanner.tsx`. Can external AI redesign safely? Limited; camera/browser APIs.
- Section name: Manual search. Where defined: `src/components/ScannerManualCustomerSearch.tsx`. Can external AI redesign safely? Limited; tenant/branch scoping.
- Section name: Scan token result/action page. Where defined: `src/app/scan/[token]/page.tsx`. Can external AI redesign safely? Very carefully; operational actions.

### Public Customer Card

- Section name: Public card route/data assembly. Where defined: `src/app/card/[token]/page.tsx`. Can external AI redesign safely? Limited; token data/QR/export.
- Section name: Wallet card front/scan view. Where defined: `src/components/public-card/LoyaltyWalletCard.tsx`, `WalletCardShell.tsx`. Can external AI redesign safely? Yes with QR/export tests.
- Section name: Export front/back. Where defined: `LoyaltyCardFrontExport.tsx`, `LoyaltyCardBackExport.tsx`, `SaveCardImageButton.tsx`. Can external AI redesign safely? Limited; HTML-to-image fragile.
- Section name: Tier/referral/save sections. Where defined: `TierStatusPanel`, `ReferralPanel`, `ProgramRewardCard`, route page. Can external AI redesign safely? Yes if routes/share links preserved.

### Scan Token Page

- Section name: Customer/program scan result. Where defined: `src/app/scan/[token]/page.tsx`, `ScannerResultCard`. Can external AI redesign safely? Limited.
- Section name: Issue stamp/redeem forms. Where defined: `src/app/scan/[token]/page.tsx`, `ConfirmSubmitButton`, `IdempotencyInput`, `src/app/scan/actions.ts`. Can external AI redesign safely? No without engineering validation.
- Section name: Post-stamp WhatsApp prompt. Where defined: `StampWhatsAppSharePrompt`. Can external AI redesign safely? Visual only.

## Mapping Issues Found

- `src/app/page.tsx` is verified as the public marketing homepage. It is not the Business Owner dashboard.
- There is no verified `/product` or `/features` route file. Public marketing routes that do exist are `/benefits`, `/solutions`, `/pricing`, `/resources`, `/company`, `/faq`, and `/request-demo`.
- `actions.ts` files under app folders are server action modules, not Next routes unless named `route.ts`.
- `src/app/dashboard/exports/[type]/route.ts`, platform export files, logout, idle logout, and support-session files are route handlers, not UI pages.
- `src/components/HomepageLoyaltyCardDemo.tsx` exists but had no verified direct import in the static usage scan. Confirm before deleting or sending to external UI work.
- Two status badge components exist: `src/components/StatusBadge.tsx` and `src/components/ui/StatusBadge.tsx`. They are both real and both widely used; do not merge casually.
- Public card export architecture has multiple real files: `LoyaltyCardExport.tsx`, `LoyaltyCardFrontExport.tsx`, and `LoyaltyCardBackExport.tsx`. External UI work must know which renderer is being changed.
- Large/high-risk UI files that combine UI and actions/data: `src/app/dashboard/customers/[id]/page.tsx`, `src/app/scan/[token]/page.tsx`, `src/components/ProgramDesignStudioForm.tsx`, `src/app/platform/operations-center/page.tsx`.
- No duplicated route files were found for the same exact route path in the scanned route set.

## Recommended Files to Send to External AI

### Homepage redesign

- `src/app/page.tsx`
- `src/components/HomepageMotion.tsx`
- `src/components/marketing/MarketingLayout.tsx`
- `src/app/globals.css`
- Optional after confirming usage: `src/components/HomepageLoyaltyCardDemo.tsx`

### Business Owner dashboard redesign

- `src/app/dashboard/page.tsx`
- `src/components/DashboardShell.tsx`
- `src/components/RoleNavigation.tsx`
- `src/components/BusinessBrandingProvider.tsx`
- `src/components/layouts/DashboardPageLayout.tsx`
- `src/components/ui/MetricCard.tsx`
- `src/components/ui/SectionCard.tsx`
- `src/components/ui/PageIntro.tsx`
- `src/components/ui/PageActions.tsx`
- `src/components/ui/Timeline.tsx`
- `src/app/globals.css`

### Customer 360 redesign

- `src/app/dashboard/customers/[id]/page.tsx`
- `src/components/CardShareActions.tsx`
- `src/components/CopyButton.tsx`
- `src/components/ConfirmSubmitButton.tsx`
- `src/components/CsrfInput.tsx`
- `src/components/ui/ActionMenu.tsx`
- `src/components/ui/SectionCard.tsx`
- `src/components/ui/MetricCard.tsx`
- `src/components/ui/Timeline.tsx`
- `src/components/ui/ProgressBar.tsx`

### Public customer card redesign

- `src/app/card/[token]/page.tsx`
- `src/components/public-card/LoyaltyWalletCard.tsx`
- `src/components/public-card/WalletCardShell.tsx`
- `src/components/public-card/LoyaltyCardFrontExport.tsx`
- `src/components/public-card/LoyaltyCardBackExport.tsx`
- `src/components/public-card/ProgramRewardCard.tsx`
- `src/components/public-card/ReferralPanel.tsx`
- `src/components/public-card/TierStatusPanel.tsx`
- `src/components/SaveCardImageButton.tsx`
- `src/components/CardShareActions.tsx`
- `src/lib/card-design.ts`
- `src/lib/card-render-model.ts`
- `src/lib/card-themes.ts`

### Scanner redesign

- `src/app/dashboard/scanner/page.tsx`
- `src/app/branch/scanner/page.tsx`
- `src/app/staff/scanner/page.tsx`
- `src/app/scan/[token]/page.tsx`
- `src/app/scan/actions.ts`
- `src/components/CameraScanner.tsx`
- `src/components/ScannerManualCustomerSearch.tsx`
- `src/components/ScannerSoundFeedback.tsx`
- `src/components/StampWhatsAppSharePrompt.tsx`
- `src/components/domain/ScannerResultCard.tsx`
- `src/components/layouts/ScannerPageLayout.tsx`

### Global navigation redesign

- `src/components/DashboardShell.tsx`
- `src/components/RoleNavigation.tsx`
- `src/components/BusinessBrandingProvider.tsx`
- `src/components/marketing/MarketingLayout.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/ui/Button.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/PageActions.tsx`
- `src/components/ui/styles.ts`
- `src/components/ui/utils.ts`

## Verification Checklist

- Project tree scanned.
- All routes verified from existing `page.tsx`, `route.ts`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx` files.
- No guessed folders included.
- No invented paths included.
- All recommended files exist in the scanned project.
- High-impact components marked.
- Old incorrect mappings removed.
- Route handlers are separated from UI pages.
- Known suspicious/large mappings documented under "Mapping Issues Found".

