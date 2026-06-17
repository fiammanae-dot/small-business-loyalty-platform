# LoyaltyBase Page Inventory

Version: 1.0

## Public

| Route | Page file | Role access | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Public, redirects authenticated users | Product landing page |
| `/login` | `src/app/login/page.tsx` | Public, redirects authenticated users | Login |
| `/logout` | `src/app/logout/route.ts` | Authenticated/session | Logout |
| `/change-password` | `src/app/change-password/page.tsx` | Authenticated forced change | Password change |
| `/card/[token]` | `src/app/card/[token]/page.tsx` | Public token | Customer loyalty card |
| `/scan/[token]` | `src/app/scan/[token]/page.tsx` | Authenticated scanner roles | QR scan result and stamp/reward workflow |
| `/referral/[code]` | `src/app/referral/[code]/page.tsx` | Public code | Referral landing |
| `/api/session/idle-logout` | `src/app/api/session/idle-logout/route.ts` | Authenticated/browser session | Idle logout endpoint |

## System Administrator

| Route | Page file | Purpose |
|---|---|---|
| `/platform` | `src/app/platform/page.tsx` | Platform Operations Center |
| `/platform/businesses` | `src/app/platform/businesses/page.tsx` | Business directory |
| `/platform/businesses/new` | `src/app/platform/businesses/new/page.tsx` | Create business |
| `/platform/businesses/[id]` | `src/app/platform/businesses/[id]/page.tsx` | Business detail |
| `/platform/businesses/[id]/edit` | `src/app/platform/businesses/[id]/edit/page.tsx` | Edit business |
| `/platform/plans` | `src/app/platform/plans/page.tsx` | Plan management |
| `/platform/subscriptions` | `src/app/platform/subscriptions/page.tsx` | Subscription management |
| `/platform/invoices` | `src/app/platform/invoices/page.tsx` | Invoice management |
| `/platform/invoices/new` | `src/app/platform/invoices/new/page.tsx` | Create invoice |
| `/platform/invoices/[id]` | `src/app/platform/invoices/[id]/page.tsx` | Invoice detail |
| `/platform/users` | `src/app/platform/users/page.tsx` | User directory |
| `/platform/health-analytics` | `src/app/platform/health-analytics/page.tsx` | Health analytics |
| `/platform/audit-center` | `src/app/platform/audit-center/page.tsx` | Audit center |
| `/platform/billing-center` | `src/app/platform/billing-center/page.tsx` | Billing center |
| `/platform/tenant-center` | `src/app/platform/tenant-center/page.tsx` | Tenant center |
| `/platform/settings` | `src/app/platform/settings/page.tsx` | Platform settings |
| `/platform/database` | `src/app/platform/database/page.tsx` | Database view |
| `/platform/launch-readiness` | `src/app/platform/launch-readiness/page.tsx` | Launch readiness |

## Business Owner

| Route | Page file | Purpose |
|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | Business dashboard |
| `/dashboard/customers` | `src/app/dashboard/customers/page.tsx` | Customer list |
| `/dashboard/customers/new` | `src/app/dashboard/customers/new/page.tsx` | Create customer |
| `/dashboard/customers/[id]` | `src/app/dashboard/customers/[id]/page.tsx` | Customer 360 |
| `/dashboard/customers/[id]/edit` | `src/app/dashboard/customers/[id]/edit/page.tsx` | Edit customer |
| `/dashboard/programs` | `src/app/dashboard/programs/page.tsx` | Program list |
| `/dashboard/programs/new` | `src/app/dashboard/programs/new/page.tsx` | Create program |
| `/dashboard/programs/[id]` | `src/app/dashboard/programs/[id]/page.tsx` | Program detail |
| `/dashboard/programs/[id]/edit` | `src/app/dashboard/programs/[id]/edit/page.tsx` | Edit program |
| `/dashboard/programs/[id]/customers` | `src/app/dashboard/programs/[id]/customers/page.tsx` | Program customers |
| `/dashboard/branches` | `src/app/dashboard/branches/page.tsx` | Branch management |
| `/dashboard/staff` | `src/app/dashboard/staff/page.tsx` | Staff management |
| `/dashboard/staff/[id]` | `src/app/dashboard/staff/[id]/page.tsx` | Staff detail |
| `/dashboard/referrals` | `src/app/dashboard/referrals/page.tsx` | Referral center |
| `/dashboard/referrals/[id]` | `src/app/dashboard/referrals/[id]/page.tsx` | Referral detail |
| `/dashboard/notifications` | `src/app/dashboard/notifications/page.tsx` | Alert center |
| `/dashboard/notifications/[id]` | `src/app/dashboard/notifications/[id]/page.tsx` | Alert detail |
| `/dashboard/engagement` | `src/app/dashboard/engagement/page.tsx` | Engagement center |
| `/dashboard/engagement/[id]` | `src/app/dashboard/engagement/[id]/page.tsx` | Engagement detail |
| `/dashboard/messages` | `src/app/dashboard/messages/page.tsx` | Message outbox |
| `/dashboard/messages/[id]` | `src/app/dashboard/messages/[id]/page.tsx` | Message detail |
| `/dashboard/scanner` | `src/app/dashboard/scanner/page.tsx` | Scanner |
| `/dashboard/billing` | `src/app/dashboard/billing/page.tsx` | Business billing |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Business settings |
| `/dashboard/branding` | `src/app/dashboard/branding/page.tsx` | Branding |
| `/dashboard/profile` | `src/app/dashboard/profile/page.tsx` | Profile |
| `/dashboard/activity/[id]` | `src/app/dashboard/activity/[id]/page.tsx` | Activity detail |
| `/dashboard/exports/[type]` | `src/app/dashboard/exports/[type]/route.ts` | CSV export |

## Branch Manager

| Route | Page file | Purpose |
|---|---|---|
| `/branch` | `src/app/branch/page.tsx` | Branch dashboard |
| `/branch/customers` | `src/app/branch/customers/page.tsx` | Branch customers |
| `/branch/customers/new` | `src/app/branch/customers/new/page.tsx` | Create customer |
| `/branch/customers/[id]` | `src/app/branch/customers/[id]/page.tsx` | Customer detail |
| `/branch/programs` | `src/app/branch/programs/page.tsx` | Branch programs |
| `/branch/programs/[id]` | `src/app/branch/programs/[id]/page.tsx` | Program detail |
| `/branch/programs/[id]/customers` | `src/app/branch/programs/[id]/customers/page.tsx` | Program customers |
| `/branch/scanner` | `src/app/branch/scanner/page.tsx` | Branch scanner |

## Staff

| Route | Page file | Purpose |
|---|---|---|
| `/staff` | `src/app/staff/page.tsx` | Staff dashboard |
| `/staff/customers/new` | `src/app/staff/customers/new/page.tsx` | Customer enrollment |
| `/staff/customers/success` | `src/app/staff/customers/success/page.tsx` | Enrollment success |
| `/staff/programs` | `src/app/staff/programs/page.tsx` | Program visibility |
| `/staff/scanner` | `src/app/staff/scanner/page.tsx` | Staff scanner |

