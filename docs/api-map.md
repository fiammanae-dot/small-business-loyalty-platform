# LoyaltyBase API and Action Map

Version: 1.0

## API Routes

| Route | File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|---|
| `/logout` | `src/app/logout/route.ts` | Destroy session | POST form/CSRF | Redirect login | Authenticated/session |
| `/api/session/idle-logout` | `src/app/api/session/idle-logout/route.ts` | Destroy idle session | POST | `{ ok: true }` | Same-origin session |
| `/dashboard/exports/[type]` | `src/app/dashboard/exports/[type]/route.ts` | CSV export | export type/path | CSV response | Business Owner |

## Authentication Actions

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/login/actions.ts` | Login, CSRF, rate limit | email, password, CSRF | session/redirect or error | Public |
| `src/app/change-password/actions.ts` | Forced password change | current/new password | redirect/error | Authenticated |

## Customers

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/dashboard/actions.ts` | Business customer create/update/card controls | form data | redirect/status | Business Owner |
| `src/app/branch/customers/actions.ts` | Branch customer actions | form data | redirect/status | Branch Manager |
| `src/app/staff/customers/actions.ts` | Staff enrollment | form data | redirect/status | Staff |
| `src/app/card-share-actions.ts` | Audit WhatsApp/card share clicks | customer/card data | status | Authenticated roles/public card context |

## Programs

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/dashboard/programs/actions.ts` | Create/update programs and enrollment | program form data | redirect/status | Business Owner |
| `src/app/branch/programs/actions.ts` | Branch-scoped program/customer actions | form data | redirect/status | Branch Manager |

## Scanner and Loyalty

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/scan/actions.ts` | Issue stamps, redeem rewards, cooldown checks | token, quantity, reason, idempotency key | redirect/status | Business Owner/Branch Manager/Staff as allowed |
| `src/app/staff/scanner/actions.ts` | Staff scanner helpers | token/form | redirect/status | Staff |
| `src/app/branch/scanner/actions.ts` | Branch scanner helpers | token/form | redirect/status | Branch Manager |

## Referrals

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/lib/referrals.ts` | Create referral context, qualify, reward | customer/referral data | referral/reward records | Called from customer/stamp flows |

## Billing and Subscriptions

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/platform/businesses/actions.ts` | Create/update business/subscription | business, owner, branch, plan, billing cycle | redirect/status | System Administrator |
| `src/app/platform/subscriptions/actions.ts` | Subscription lifecycle | subscription id, action, dates | redirect/status | System Administrator |
| `src/app/platform/invoices/actions.ts` | Invoice/payment actions | invoice/payment form data | redirect/status | System Administrator |

## Messages and Engagement

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/dashboard/messages/actions.ts` | Mark sent/cancel message | queue id/action | redirect/status | Business Owner |
| `src/lib/engagement.ts` | Engagement event creation/dedupe | customer/program event context | engagement records | Internal business flows |

## Alerts, Policies, and Settings

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/app/dashboard/notifications/actions.ts` | Alert assignment/review/escalation/resolution | alert id/action/notes | redirect/status | Business Owner/Branch Manager scoped |
| `src/app/platform/settings/actions.ts` | Platform settings/demo mode | setting form | redirect/status | System Administrator |

## Tiers

| File | Purpose | Input | Output | Authorization |
|---|---|---|---|---|
| `src/lib/customer-tiers.ts` | Calculate and persist customer tier | business settings, visits | tier result | Internal flows/customer profile/card |

