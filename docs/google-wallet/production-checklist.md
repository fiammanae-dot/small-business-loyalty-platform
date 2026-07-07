# Google Wallet Production Checklist

## Google Console

- [ ] Google Wallet API is enabled.
- [ ] Issuer account is approved or submitted for review.
- [ ] Service account is added as an issuer developer.
- [ ] Service account key is stored only in production environment variables.
- [ ] Production origin is `https://loyaltycarduae.com`.

## Loyalty Card UAE

- [ ] `0041_google_wallet_integration` migration deployed.
- [ ] `GOOGLE_WALLET_ISSUER_ID` configured.
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` configured.
- [ ] `GOOGLE_PRIVATE_KEY` configured with escaped newlines or multiline secret support.
- [ ] `NEXT_PUBLIC_APP_URL` and `APP_URL` point to `https://loyaltycarduae.com`.
- [ ] `/logo.png` is publicly accessible over HTTPS.
- [ ] `/support`, `/privacy`, and `/terms` pages are live.

## Functional QA

- [ ] Public customer card shows `Add to Google Wallet`.
- [ ] Customer can save a pass from a real active scan token.
- [ ] Business Owner Customer 360 shows Wallet status.
- [ ] Regenerate/preview pass opens the Google save flow.
- [ ] Stamp issuance updates the Wallet object.
- [ ] Reward redemption/card reset updates the Wallet object.
- [ ] Manual correction and stamp undo update the Wallet object.
- [ ] Google API errors do not block scanner, reward, or customer flows.

## Security QA

- [ ] Private key does not appear in client bundles.
- [ ] Wallet save API validates scan token and active business/card/program state.
- [ ] Wallet save API is rate limited.
- [ ] Business Owner screens only show data from the current business.
- [ ] No cross-business Wallet object access is possible through dashboard actions.
