# Component Inventory

Verified reusable components in `src/components`.

## Global Shell And Navigation

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `DashboardShell` | `src/components/DashboardShell.tsx` | Nearly all authenticated pages under `/platform`, `/dashboard`, `/branch`, `/staff`, `/scan` | Already shared | High |
| `RoleNavigation` | `src/components/RoleNavigation.tsx` | Used by `DashboardShell` for role-specific nav | Already shared | High |
| `BusinessBrandingProvider` | `src/components/BusinessBrandingProvider.tsx` | Operational authenticated shell | Already shared | High |
| `IdleSessionTimeout` | `src/components/IdleSessionTimeout.tsx` | Authenticated shell/session | Already shared | Medium |
| `AppToaster` | `src/components/AppToaster.tsx` | Root/app toast notifications | Already shared | Medium |

## Forms And Security Inputs

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `LoginForm` | `src/components/LoginForm.tsx` | `/login` | Auth-specific | Medium |
| `ForgotPasswordForm` | `src/components/ForgotPasswordForm.tsx` | `/forgot-password` | Auth-specific | Medium |
| `ResetPasswordForm` | `src/components/ResetPasswordForm.tsx` | `/reset-password` | Auth-specific | Medium |
| `ChangePasswordForm` | `src/components/ChangePasswordForm.tsx` | `/change-password` | Auth-specific | Medium |
| `CsrfInput` | `src/components/CsrfInput.tsx` | Forms and protected actions | Already shared | High |
| `IdempotencyInput` | `src/components/IdempotencyInput.tsx` | Stamp/reward and protected workflows | Already shared | High |
| `ConfirmSubmitButton` | `src/components/ConfirmSubmitButton.tsx` | High-risk business/admin actions | Already shared | High |
| `SearchableCombobox` | `src/components/SearchableCombobox.tsx` | Large business/branch/customer selectors | Already shared | Medium |
| `BranchLocationFields` | `src/components/BranchLocationFields.tsx` | Business branch country/city forms | Shared candidate | Medium |
| `BusinessForm` | `src/components/BusinessForm.tsx` | Platform create/edit business | Already shared | High |
| `ProgramForm` | `src/components/ProgramForm.tsx` | Business Owner create/edit program | Already shared | High |
| `PlanBillingCycleFields` | `src/components/PlanBillingCycleFields.tsx` | Plan/subscription forms | Shared | Medium |

## Platform Management Components

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `PlatformKpiGrid` | `src/components/PlatformKpiGrid.tsx` | `/platform`, audit, billing, plans, tenant, database, subscriptions, analytics | Already shared | Medium |
| `PlatformCards` | `src/components/PlatformCards.tsx` | Platform-style cards | Shared candidate | Medium |
| `MobileFilterDrawer` | `src/components/MobileFilterDrawer.tsx` | Businesses, billing, audit, users, tenant, invoices, subscriptions, plans | Already shared | Medium |
| `MobileAccordionSection` | `src/components/MobileAccordionSection.tsx` | Billing mobile secondary sections | Shared candidate | Low |
| `MobileTabSelector` | `src/components/MobileTabSelector.tsx` | Mobile tab/section controls | Shared candidate | Low |
| `SettingsMobileSectionSelect` | `src/components/SettingsMobileSectionSelect.tsx` | Business settings mobile selector | Shared candidate with `MobileTabSelector` | Low |
| `StatusBadge` | `src/components/StatusBadge.tsx` | Customers, staff, business, subscription, scan, settings, tenant/user pages | Already shared but duplicated locally elsewhere | Medium |
| `InvoiceBadge` | `src/components/InvoiceBadge.tsx` | Invoice status UI | Can merge policy with `StatusBadge` later | Low |
| `PlatformUserPasswordResetAction` | `src/components/PlatformUserPasswordResetAction.tsx` | `/platform/users` | Specialized | Medium |

## Scanner And Loyalty Components

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `CameraScanner` | `src/components/CameraScanner.tsx` | Business, branch, staff scanner pages | Already shared | Critical |
| `ScannerManualCustomerSearch` | `src/components/ScannerManualCustomerSearch.tsx` | Scanner pages/universal lookup | Already shared | High |
| `ScannerSoundFeedback` | `src/components/ScannerSoundFeedback.tsx` | Scanner result feedback | Already shared | Medium |
| `CardThemePreviewSelector` | `src/components/CardThemePreviewSelector.tsx` | Program create/edit theme selection | Already shared | Medium |
| `CardShareActions` | `src/components/CardShareActions.tsx` | Customer profile/list/success/public card share flows | Already shared | Medium |
| `SaveCardImageButton` | `src/components/SaveCardImageButton.tsx` | Public card Save as Image | Specialized | Medium |
| `CopyButton` | `src/components/CopyButton.tsx` | Public card/referral/link copy | Already shared | Low |

## Referral Components

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `ReferralInviteActions` | `src/components/ReferralInviteActions.tsx` | Public referral page | Specialized | Medium |
| `ReferralShareActions` | `src/components/ReferralShareActions.tsx` | Public card/referral sharing | Shared | Medium |
| `ReferralPhoneLookupPreview` | `src/components/ReferralPhoneLookupPreview.tsx` | Customer enrollment forms | Shared | High |

## Staff And Account Components

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `StaffPasswordResetAction` | `src/components/StaffPasswordResetAction.tsx` | Business Owner staff page | Specialized | Medium |

## Public Homepage Components

| Component | File | Current locations | Can become shared? | Risk |
|---|---|---|---|---|
| `HomepageMotion` | `src/components/HomepageMotion.tsx` | Homepage section animation wrappers | Shared for public marketing | Low |
| `HomepageLoyaltyCardDemo` | `src/components/HomepageLoyaltyCardDemo.tsx` | Homepage interactive loyalty card preview | Specialized | Low |
| `DemoRequestForm` | `src/components/DemoRequestForm.tsx` | `/request-demo` | Public form | Low |

## Missing Shared Components

These patterns appear repeatedly but are not consistently extracted:

- `MetricCard` for platform and business KPIs.
- `ActionMenu` for View/Edit/Disable/Archive/Payment lifecycle actions.
- `ResponsiveRecordList` for desktop table + mobile card pairs.
- `DetailHeader` for detail pages.
- `InfoGrid` / `InfoRow` for record details.
- `EmptyState` for list and search empty states.
- `PageSectionCard` for repeated bordered white panels.
- `ProgressBar` for program/card/tier progress.
- `Timeline` for activity/audit/referral history.

## Component Risk Summary

| Risk | Components |
|---|---|
| Critical | `CameraScanner` |
| High | `DashboardShell`, `RoleNavigation`, `BusinessBrandingProvider`, `BusinessForm`, `ProgramForm`, `ScannerManualCustomerSearch`, `CsrfInput`, `IdempotencyInput`, `ConfirmSubmitButton`, `ReferralPhoneLookupPreview` |
| Medium | `StatusBadge`, `PlatformKpiGrid`, `MobileFilterDrawer`, `CardShareActions`, `ReferralShareActions`, auth forms, password reset actions |
| Low | Public homepage components, copy button, mobile accordion/selector helpers |
