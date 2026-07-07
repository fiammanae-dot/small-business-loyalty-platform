# Google Wallet Deployment Guide

## 1. Apply Database Migration

Deploy migration `0041_google_wallet_integration`:

```bash
npx prisma migrate deploy
npm run prisma:generate
```

The migration is additive and creates:

- `GoogleWalletSyncStatus`
- `google_wallet_classes`
- `google_wallet_objects`

It does not alter existing customer, scanner, stamp, reward, referral, or program data.

## 2. Configure Production Environment

In Vercel Production, set:

```env
NEXT_PUBLIC_APP_URL=https://loyaltycarduae.com
NEXT_PUBLIC_SITE_URL=https://loyaltycarduae.com
APP_URL=https://loyaltycarduae.com
GOOGLE_WALLET_ISSUER_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
```

Never expose the private key to client-side variables.

## 3. Redeploy

After setting environment variables:

```bash
npm run build
```

Then redeploy through Vercel.

## 4. Smoke Test

1. Open a public customer card.
2. Click `Add to Google Wallet`.
3. Confirm the request redirects to `https://pay.google.com/gp/v/save/...`.
4. Issue a stamp from the scanner.
5. Confirm the associated `google_wallet_objects.last_synced_at` updates.
6. Confirm failures are stored in `google_wallet_objects.last_error` without blocking stamp issuance.

## 5. Rollback

If Google Wallet needs to be temporarily disabled, remove or clear the Google Wallet environment variables and redeploy. The app will keep loyalty flows running and show Wallet as unavailable.
