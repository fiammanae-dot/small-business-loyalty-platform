# Device QA Checklists

Use these checklists before pilot onboarding.

## Android QA Checklist

- Open `/login` in Chrome.
- Login works.
- Dashboard fits without horizontal scroll.
- Customer list cards are readable.
- Scanner page opens.
- Camera permission prompt appears.
- Camera starts.
- Switch Camera works if device supports it.
- QR is detected.
- Manual token paste works.
- Stamp issuance buttons are touch-friendly.
- Public card opens and QR is visible.

## iPhone QA Checklist

- Open `/login` in Safari.
- Login works.
- Dashboard fits without horizontal scroll.
- Scanner page opens over HTTPS or supported local test setup.
- Camera permission prompt appears.
- Camera starts.
- QR is detected.
- Manual token paste works.
- Public card renders correctly.
- Copy link buttons work where supported.
- WhatsApp share link opens manually.

## Scanner QA Checklist

- Valid QR redirects to `/scan/{token}`.
- Full scan URL is accepted.
- Raw scan token is accepted.
- Invalid QR shows clean error.
- Wrong-system QR shows clean error.
- Wrong-business QR is blocked.
- Disabled token is blocked.
- Reward-ready customer shows reward indicator.
- Stamp issuance does not duplicate from double-click.
- Scan event is logged.

## Mobile UI QA Checklist

- No horizontal scrolling on dashboard.
- Tables convert to cards where designed.
- Buttons are large enough to tap.
- Filter panels are usable.
- Customer profile tabs are reachable.
- Notification cards are readable.
- Message outbox cards are readable.
- Billing pages remain readable for System Administrator.
- Tenant Center remains readable for System Administrator.
