# LoyaltyBase QA Test Scenarios

Version: 1.0

## Authentication

### QA-AUTH-001: Login
Objective: Verify valid user can log in.  
Steps: Open `/login`, enter valid email/password, submit.  
Expected Result: User lands on role dashboard.

### QA-AUTH-002: Invalid Login
Objective: Verify invalid credentials are rejected.  
Steps: Enter invalid credentials.  
Expected Result: Friendly invalid email/password message and failed login audit.

### QA-AUTH-003: Idle Timeout
Objective: Verify inactivity sign-out.  
Steps: Log in, do not interact for 15 minutes.  
Expected Result: Session ends and browser redirects to login.

### QA-AUTH-004: Role Redirect
Objective: Verify authenticated users visiting `/` or `/login` redirect to role home.  
Steps: Log in as each role and visit `/`, `/login`.  
Expected Result: Correct dashboard route.

## Business Creation

### QA-BIZ-001: Create Starter Business
Objective: Verify System Administrator can create Starter business.  
Steps: Platform > Businesses > New Business, choose Starter monthly/yearly.  
Expected Result: Business, owner, branch, subscription created.

### QA-BIZ-002: Multi Branch Yearly Only
Objective: Verify Multi Branch cannot be monthly.  
Steps: Create business, select Multi Branch.  
Expected Result: Monthly option unavailable or blocked.

## Customers

### QA-CUST-001: Create Customer
Objective: Verify Business Owner can create customer.  
Steps: Login Business Owner, Customers > Add Customer, complete form.  
Expected Result: Customer created with card token.

### QA-CUST-002: UAE Phone Normalization
Objective: Verify phone formats normalize.  
Steps: Create/update customer with `05XXXXXXXX`, `9715XXXXXXXX`, `009715XXXXXXXX`.  
Expected Result: Stored normalized phone is `+9715XXXXXXXX`.

### QA-CUST-003: Duplicate Phone Prevention
Objective: Prevent duplicate customer by normalized phone.  
Steps: Create same phone in different accepted formats.  
Expected Result: Duplicate blocked.

## Programs

### QA-PROG-001: Create Program
Objective: Verify loyalty program creation.  
Steps: Programs > New, set required stamps, reward, bonus.  
Expected Result: Program created.

### QA-PROG-002: Plan Program Limit
Objective: Verify plan limits.  
Steps: On Starter, create second program.  
Expected Result: Blocked with plan limit message.

## Branches and Staff

### QA-BRANCH-001: Create Branch
Objective: Verify branch creation.  
Steps: Branches > Create branch.  
Expected Result: Branch created if plan limit allows.

### QA-STAFF-001: Create Staff
Objective: Verify staff creation.  
Steps: Staff > Add staff user.  
Expected Result: Staff account created.

### QA-STAFF-002: Reset Staff Password
Objective: Verify Business Owner can reset staff password.  
Steps: Open staff detail, reset password.  
Expected Result: Temporary password displayed once, force change enabled.

## Scanner and Rewards

### QA-SCAN-001: Open Scanner
Objective: Verify scanner opens.  
Steps: Open scanner as Staff, Branch Manager, Business Owner.  
Expected Result: Camera/manual fallback visible.

### QA-SCAN-002: Manual Token Fallback
Objective: Verify paste token works.  
Steps: Paste card/scan token.  
Expected Result: Redirects to `/scan/[token]`.

### QA-STAMP-001: Issue One Stamp
Objective: Verify stamp issuance.  
Steps: Scan valid card, issue +1 stamp.  
Expected Result: earned stamps increment, transaction created.

### QA-STAMP-002: Multi-Stamp Reason
Objective: Verify reason required for >1 stamps.  
Steps: Try +2 to +5 without reason.  
Expected Result: blocked until reason provided.

### QA-REWARD-001: Redeem Reward
Objective: Verify reward redemption.  
Steps: Scan reward-ready card as Business Owner/Branch Manager.  
Expected Result: redemption record created, earned stamps reset, bonus restored.

### QA-REWARD-002: Staff Cannot Redeem
Objective: Verify Staff cannot redeem.  
Steps: Login Staff, scan reward-ready card.  
Expected Result: redemption action unavailable/blocked.

## Referrals

### QA-REF-001: Referral Link Opens
Objective: Verify referral landing.  
Steps: Open `/referral/[code]`.  
Expected Result: valid code displays business/program context.

### QA-REF-002: First Stamp Qualifies Referral
Objective: Verify referral qualification.  
Steps: Enroll referred customer, issue first stamp.  
Expected Result: referral becomes qualified and reward granted.

### QA-REF-003: Self-Referral Block
Objective: Verify abuse prevention.  
Steps: Try to refer same customer.  
Expected Result: blocked/audited.

## Tier System

### QA-TIER-001: Bronze Default
Objective: Verify new customer starts Bronze.  
Steps: Create customer.  
Expected Result: Bronze tier displayed.

### QA-TIER-002: Silver/Gold/VIP Thresholds
Objective: Verify visit thresholds.  
Steps: Issue enough qualifying stamps/visits.  
Expected Result: tier updates at configured thresholds.

### QA-TIER-003: Customer Card Hides Spend
Objective: Verify public card privacy.  
Steps: Open public card.  
Expected Result: no spend/value analytics shown.

## Billing and Subscriptions

### QA-BILL-001: Create Invoice
Objective: Verify invoice creation.  
Steps: Platform > Invoices > New.  
Expected Result: invoice created for selected business/subscription.

### QA-SUB-001: Suspend Business
Objective: Verify subscription restriction.  
Steps: Suspend subscription, attempt scan/stamp/customer creation.  
Expected Result: restricted with friendly message.

## Reports

### QA-EXP-001: Customer CSV Export
Objective: Verify CSV export.  
Steps: Business Owner > export customers.  
Expected Result: CSV downloads with business-scoped data.

## Alerts

### QA-ALERT-001: Alert Workflow
Objective: Verify assign/review/escalate/resolve.  
Steps: Open alert, perform lifecycle actions.  
Expected Result: status updates and audit/history records created.

