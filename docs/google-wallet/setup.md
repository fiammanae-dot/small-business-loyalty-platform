# Google Wallet Setup

This integration creates Google Wallet loyalty passes for Loyalty Card UAE customer-program memberships.

## Prerequisites

- Google Pay and Wallet Console access.
- Google Wallet API enabled for the Google Cloud project.
- A service account authorized in the Google Pay and Wallet Console with issuer permissions.
- Production app URL configured as `https://loyaltycarduae.com`.

## Required Environment Variables

Set these only on the server or deployment platform:

```env
GOOGLE_WALLET_ISSUER_ID="issuer-id-from-google-wallet-console"
GOOGLE_SERVICE_ACCOUNT_EMAIL="wallet-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The private key may be stored with escaped newlines. The application normalizes `\n` at runtime.

## How It Works

1. A Wallet class is created per loyalty program.
2. A Wallet object is created per customer-program membership.
3. The save link is generated server-side using a signed `savetowallet` JWT.
4. Stamp, reward reset, undo, and manual correction flows attempt a non-blocking Wallet object sync after the local transaction succeeds.
5. If Google Wallet is not configured or Google API calls fail, loyalty business logic still completes and the sync error is logged.

## Data Model

- `google_wallet_classes`: stores one Google Wallet class per loyalty program.
- `google_wallet_objects`: stores one Google Wallet object per customer-program membership.

No customer, reward, scanner, or stamp records are duplicated for Wallet.

## Public Save URL

Customer add-to-wallet links use:

```txt
/api/wallet/google/save/{scanToken}
```

The endpoint validates that the scan token, business, customer card, and program are active before generating a Google Wallet save link.
