# Staff End-to-End Journey

Expected outcome:

Staff can enroll customers, scan cards, and issue stamps without accessing restricted management areas.

## Preconditions

- Staff account exists.
- Staff account is active.
- Assigned branch is active.
- Business subscription is active or trial.

## Journey Steps

### 1. Login

1. Open `/login`.
2. Login as Staff.

Expected:

- User redirects to `/staff`.
- Only Staff navigation is visible.

### 2. Review Staff Dashboard

1. Confirm staff name.
2. Confirm business and branch.
3. Review today's activity.
4. Open scanner.

Expected:

- Dashboard is simple and mobile-friendly.
- Scanner action is obvious.

### 3. Enroll Customer

1. Open `/staff/customers/new`.
2. Enter customer first name and phone.
3. Submit enrollment.

Expected:

- Customer is enrolled.
- Success page displays public card URL.
- Staff can copy/open/share card link.

### 4. Scan Customer QR

1. Open `/staff/scanner`.
2. Start camera or paste token manually.
3. Scan valid customer QR.

Expected:

- Scan result opens.
- Customer/program summary is clear.
- Wrong-business QR is blocked.
- Disabled token is blocked.

### 5. Issue One Stamp

1. Select `+1 Stamp`.
2. Submit.

Expected:

- Stamp is issued.
- Earned stamps increase by 1.
- Bonus stamps do not change.
- Stamp transaction is created.

### 6. Issue Multiple Stamps

1. Select `+2` to `+5`.
2. Leave reason empty.
3. Submit.

Expected:

- Validation requires reason.

Then:

1. Enter reason.
2. Submit.

Expected:

- Stamps are issued.
- Suspicious alert may be generated.

### 7. Restricted Actions

Attempt:

- Open `/dashboard`.
- Open `/branch`.
- Redeem reward.
- Manage programs.
- View full customer list if not allowed.

Expected:

- Access is blocked or redirected.
- Staff cannot redeem rewards.

## Issues To Watch

- Scanner too hard to start on mobile.
- Manual token input hidden.
- Success page does not show card URL.
- Staff accidentally expects reward redemption.
- Multi-stamp reason validation unclear.
