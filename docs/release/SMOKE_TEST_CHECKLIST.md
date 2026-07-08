# Smoke Test Checklist

Run this checklist against the target environment **after every production deployment**,
before announcing the release as complete. It is mandatory, not optional - if any item
fails, stop and follow the rollback steps in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
rather than leaving the deployment live in a broken state.

This is a smoke test (fast, pass/fail, click-through), not a full regression pass -
`npm test` already covers business-logic regressions. This checklist exists to catch what
automated tests cannot: a broken deploy, a misconfigured environment variable, a DNS/CDN
issue, or a third-party integration (Google Wallet, Sentry) that only fails in production.

## 1. Public Website

- [ ] Homepage loads with no console errors.
- [ ] Pricing, Solutions, Resources, FAQ, and Support pages load.
- [ ] "Request a Demo" form page loads.
- [ ] Terms and Privacy pages load.
- [ ] No mixed-content or broken-asset warnings in the browser console.

## 2. Authentication

- [ ] Login page loads.
- [ ] Login with a valid Business Owner account succeeds.
- [ ] Login with a valid Platform Owner account succeeds.
- [ ] Login with a wrong password is rejected with a clean error (no stack trace).
- [ ] "Forgot password" sends a reset email and the reset link works.
- [ ] Logout clears the session and returns to the login page.
- [ ] Repeated failed logins trigger lockout messaging (rate limiting active).

## 3. Business Owner Dashboard

- [ ] Dashboard loads with correct business name and branding.
- [ ] Programs list loads.
- [ ] Staff list loads.
- [ ] Branches list loads.
- [ ] Billing page loads and is read-only for the owner.
- [ ] Settings page loads and saves a trivial change (e.g. a support toggle).

## 4. Customer 360 / Customer Management

- [ ] Customer list loads and search/filter works.
- [ ] Opening a customer profile loads without error (this is the exact flow that broke
      in a prior incident - confirm it stays fixed).
- [ ] Customer profile shows correct stamp/reward history.
- [ ] Creating a new customer succeeds.
- [ ] Editing a customer succeeds.

## 5. Public Enrollment / Join Flow

- [ ] A program's public join link loads.
- [ ] Enrolling a new customer succeeds and redirects to their card.
- [ ] Enrolling the same phone number twice does not create a duplicate customer.
- [ ] Public card page shows correct branding, stamp progress, and QR code.
- [ ] Referral landing page loads and shows the referrer's business branding.

## 6. Scanner

- [ ] Staff scanner opens and camera permission prompt appears.
- [ ] Branch Manager scanner opens.
- [ ] Scanning a valid customer QR issues a stamp.
- [ ] Scanning an invalid/expired QR shows a clean error, not a crash.
- [ ] Scanning a QR from a different business is blocked.
- [ ] Manual token entry fallback works when camera is unavailable.

## 7. Rewards / Redemption

- [ ] "Reward Ready" state appears once the stamp threshold is reached.
- [ ] Business Owner or Branch Manager can redeem a reward.
- [ ] Staff redemption is blocked where policy requires manager approval.
- [ ] Earned stamps reset correctly after redemption.
- [ ] Redemption appears in the customer's activity history.

## 8. Programs

- [ ] Creating a new loyalty program succeeds.
- [ ] Design Studio opens and a card design change saves.
- [ ] Program join poster page renders with a scannable QR code.
- [ ] Editing an existing program succeeds without breaking active enrollments.

## 9. Google Wallet

- [ ] If Google Wallet is configured in this environment: adding a card to Google Wallet
      from the public card page succeeds.
- [ ] If Google Wallet is **not** configured: the card page does not show a broken
      "Add to Google Wallet" button, and Platform Health reports "Not configured"
      rather than erroring.
- [ ] A stamp/redemption on an already-added Wallet card syncs the pass (when configured).

## 10. Platform Administrator

- [ ] Platform dashboard loads.
- [ ] Businesses list loads and a business detail page opens.
- [ ] Creating a support session (read-only) works and the support banner appears.
- [ ] Ending a support session works and the summary is recorded.
- [ ] Audit Center, Billing Center, and Tenant Center each load.
- [ ] [Platform Health](/platform/health) loads and shows: correct app version, database
      connected, latest migration name, and accurate integration status (Google Wallet /
      Sentry / environment variables).

## 11. Runtime Health

- [ ] No new errors appear in Sentry (if configured) in the first 15 minutes post-deploy.
- [ ] Server logs show no repeated startup warnings/errors.
- [ ] `GET /platform/health` (as Platform Owner) reports database connected and all
      required environment variables set.

## Sign-Off

Deployment is confirmed healthy only when every box above is checked. Record the
deployer, environment, git commit/tag, and timestamp in the release record described in
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
