# Layout Audit

## Current Layout Families

### Public Marketing Layout

Used by:
- `/`
- `/benefits`
- `/request-demo`

Pattern:
- Full-width public page with local header/footer.
- Marketing sections are functions inside `src/app/page.tsx` plus client animation helpers.
- Visual language is warmer and more editorial than the authenticated product.

Reusable opportunity:
- Extract `PublicHeader`, `PublicFooter`, `PublicSection`, and `PublicCTA` if public pages expand.

Risk:
- Low. Public pages are isolated from authenticated product logic.

### Authentication Layout

Used by:
- `/login`
- `/forgot-password`
- `/reset-password`
- `/change-password`
- `/business-inactive`

Pattern:
- Dedicated form/card screens with validation and direct auth actions.
- Uses client form components for login/password reset/change password.

Reusable opportunity:
- Shared `AuthPageShell` and `AuthCard` would reduce repeated form framing.

Risk:
- Medium because auth flows are security-sensitive.

### Authenticated Dashboard Layout

Used by:
- Most `/platform/*`, `/dashboard/*`, `/branch/*`, `/staff/*`, and `/scan/*` pages.

Primary file:
- `src/components/DashboardShell.tsx`

Related navigation:
- `src/components/RoleNavigation.tsx`
- `src/components/BusinessBrandingProvider.tsx`

Pattern:
- Role eyebrow + page title.
- Desktop sidebar for operational/admin roles.
- Mobile bottom navigation for System Administrator, Business Owner, Branch Manager, and Staff.
- Optional welcome/profile summary controlled by `hideWelcomeMessage`.

Reusable opportunity:
- Keep as shared shell, but separate platform shell and operational shell concerns if complexity grows.

Risk:
- High. This layout touches almost every authenticated route.

### Platform Management Layout

Used by:
- `/platform/businesses`
- `/platform/subscriptions`
- `/platform/invoices`
- `/platform/users`
- `/platform/plans`
- `/platform/tenant-center`

Pattern:
- KPI row where available.
- Filter toolbar with mobile drawer.
- Desktop table plus mobile cards.
- Action dropdowns/confirmations for high-risk actions.

Shared components:
- `PlatformKpiGrid`
- `MobileFilterDrawer`
- `StatusBadge`
- `ConfirmSubmitButton`
- `SearchableCombobox`

Duplications:
- Table toolbars and mobile cards are still mostly page-local.
- Action menus vary by page.

Recommended reusable layout:
- `ManagementPageShell`
- `FilterToolbar`
- `ResponsiveRecordList`
- `RowActionMenu`

Risk:
- Medium to high because management pages also own server actions.

### Platform Analytics Layout

Used by:
- `/platform`
- `/platform/audit-center`
- `/platform/billing-center`
- `/platform/health-analytics`
- `/platform/database`
- `/platform/launch-readiness`

Pattern:
- KPI grid, summary cards, charts/tables/export sections.
- Billing center adds tab structure and mobile accordions.
- Audit center adds mobile event cards.

Reusable opportunity:
- Shared `MetricCard`, `SectionCard`, `ExportButtonGroup`, `MobileAccordionSection`.

Risk:
- Medium. Analytics calculations should stay separate from visual extraction.

### Business Operations Layout

Used by:
- `/dashboard`
- `/dashboard/customers`
- `/dashboard/programs`
- `/dashboard/referrals`
- `/dashboard/staff`
- `/dashboard/branches`
- `/dashboard/billing`
- `/dashboard/settings`

Pattern:
- Operational cards, KPI rows, mobile cards, tables, status badges, action buttons.
- Business branding variables apply to operational roles.

Duplications:
- Multiple customer summary cards.
- Multiple program progress card patterns.
- Multiple filter/search arrangements.

Recommended reusable layout:
- `OperationalPageHeader`
- `OperationalKpiCard`
- `CustomerMiniCard`
- `ProgramProgressCard`
- `ActionPanel`

Risk:
- High for dashboard, Customer 360, scanner.

### Detail Layout

Used by:
- Customer 360, program detail, referral detail, staff detail, business detail, invoice detail, user detail, activity detail, alert/message detail.

Pattern:
- Header section, status cards, detail sections, optional tabs or timeline.
- Not fully standardized.

Reusable opportunity:
- `DetailHeader`, `InfoGrid`, `DetailSection`, `BackAction`.

Risk:
- Medium. Data shapes differ; visual components can be shared without sharing data logic.

### Scanner Layout

Used by:
- `/dashboard/scanner`
- `/branch/scanner`
- `/staff/scanner`
- `/scan/[token]`
- `/scan/referral/[code]`

Pattern:
- Camera scanner plus universal lookup on landing pages.
- Result page uses compact action summary, role-specific permissions, and collapsible details.

Shared components:
- `CameraScanner`
- `ScannerManualCustomerSearch`
- `ScannerSoundFeedback`
- `ConfirmSubmitButton`

Risk:
- Critical. This is a daily cashier workflow with security, tenant isolation, reward, and cooldown rules.

### Settings Layout

Used by:
- `/dashboard/settings`
- `/platform/settings`

Pattern:
- Many sections/tabs.
- Mobile selector replaces crowded tab rows.

Shared components:
- `SettingsMobileSectionSelect`
- `MobileTabSelector`
- `StatusBadge`

Risk:
- Medium. Settings are broad and can become oversized.

## Duplicated Layouts

- Desktop table + mobile card pattern is repeated across many management pages.
- Filter toolbar + mobile drawer is repeated but partially standardized.
- Detail header/card grids are repeated with local classes.
- KPI cards are standardized mostly for platform pages, less so for operational pages.
- Public/auth layouts are isolated but not yet componentized.

## Layouts That Should Become Reusable

1. `ManagementPageShell` for System Administrator lists.
2. `ResponsiveDataTableWithCards` for desktop table/mobile cards.
3. `MetricCard` for platform and operational KPI cards.
4. `DetailPageShell` for customer/program/business/user/invoice details.
5. `ActionMenu` for row-level lifecycle actions.
6. `OperationalScannerLayout` for scanner landing pages.

## Layout Risk Map

| Layout | Risk | Reason |
|---|---|---|
| `DashboardShell`/`RoleNavigation` | High | Global authenticated shell and navigation. |
| Scanner layout | Critical | Cashier workflow, security, reward and stamp actions. |
| Customer 360 detail layout | Critical | Complex customer, card, referral, reward, tier data. |
| Platform management layout | Medium | Many similar pages, but admin-only. |
| Public marketing layout | Low | Isolated from auth and database. |
| Auth layout | Medium | Security-sensitive forms. |
