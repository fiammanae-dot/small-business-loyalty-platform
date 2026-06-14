# Branch Manager End-to-End Journey

Expected outcome:

Branch Manager can manage branch-scoped operations while viewing organization-level customers where allowed.

## Preconditions

- Branch Manager account exists.
- Account is active.
- Branch is active.
- Business subscription is active or trial.

## Journey Steps

### 1. Login

1. Open `/login`.
2. Login as Branch Manager.

Expected:

- User redirects to `/branch`.
- Only Branch navigation is visible.

### 2. Review Branch Dashboard

1. Review branch name.
2. Review business name.
3. Review branch performance.
4. Confirm quick scanner action.

Expected:

- Branch context is clear.
- No Platform or Business Owner pages are visible.

### 3. View Customers

1. Open `/branch/customers`.
2. Search for customer from same business.
3. Open customer profile.

Expected:

- Same-business customers are visible.
- Other-business customers are not visible.
- Full organization-level loyalty progress is visible.

### 4. Enroll Customer

1. Open `/branch/customers/new`.
2. Enter first name and phone.
3. Submit.

Expected:

- Customer is enrolled for same business.
- Created branch is current branch.

### 5. View Programs

1. Open `/branch/programs`.
2. Open a program.
3. Enroll eligible customer if needed.

Expected:

- Branch Manager can view and enroll.
- Branch Manager cannot create or edit programs.

### 6. Scan Customer QR

1. Open `/branch/scanner`.
2. Scan valid QR or paste token.

Expected:

- Valid scan opens result page.
- Wrong-business QR is blocked.
- Invalid QR shows safe error.

### 7. Issue Stamp

1. On scan result, issue one stamp.
2. Issue multiple stamps with reason.

Expected:

- Earned stamps increase.
- Bonus stamps remain unchanged.
- Transaction branch is current branch.
- Alert is generated if suspicious.

### 8. Redeem Reward

1. Scan reward-ready customer.
2. Confirm reward details.
3. Redeem reward.

Expected:

- Branch Manager can redeem.
- Redemption history is created.
- Earned stamps reset and bonus stamps restore.

## Issues To Watch

- Customer visibility too restricted by origin branch.
- Wrong branch attribution.
- Scanner camera permission confusion.
- Reward Ready state not obvious.
- Multi-stamp reason unclear.
