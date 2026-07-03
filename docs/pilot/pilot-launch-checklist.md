# Loyalty Card UAE Pilot Launch Checklist

Audience: non-technical founder or pilot launch owner

Purpose: use this checklist to launch Loyalty Card UAE with the first pilot business in a controlled, low-risk way.

How to use this checklist:

- Complete each section in order.
- Do not skip backup, device QA, or monitoring checks.
- Record the owner and date for every completed item.
- If any expected outcome fails, stop and resolve it before moving forward.

Launch rule:

- Start with one pilot business first.
- Keep staff count small during the first week.
- Support the business manually and collect feedback daily.

## 1. Production Server Setup

Goal: confirm the production server is ready to run Loyalty Card UAE.

Checklist:

- [ ] Choose the hosting provider or server.
- [ ] Confirm the server has Node.js installed.
- [ ] Confirm the server has access to PostgreSQL.
- [ ] Upload or deploy the latest Loyalty Card UAE code.
- [ ] Install dependencies using the documented production command.
- [ ] Confirm the application can build successfully.
- [ ] Confirm the server can start the application.
- [ ] Confirm the server time zone is correct for the launch region.

Exact verification steps:

1. Open the server dashboard or terminal.
2. Confirm the application build command completes without errors.
3. Confirm the application start command runs without crashing.
4. Open the production URL in a browser.

Expected outcome:

- The production server is online.
- The Loyalty Card UAE login page loads.
- No development server, test server, or pilot database is being used.

Stop if:

- The app does not start.
- The login page does not load.
- The server points to the development or pilot database.

## 2. Production Database Creation

Goal: create a clean production database without copying development or pilot test data.

Checklist:

- [ ] Create a new empty PostgreSQL database for production.
- [ ] Confirm the database name is clearly production-specific.
- [ ] Confirm the production database is not `loyalty_platform`.
- [ ] Confirm the production database is not `loyalty_platform_pilot`.
- [ ] Configure `DATABASE_URL` to point to the new production database.
- [ ] Run production migrations only.
- [ ] Do not run demo seed scripts.
- [ ] Do not run pilot seed scripts.

Exact verification steps:

1. Open the database administration tool.
2. Confirm the production database exists.
3. Confirm it is empty before migrations.
4. Run the production migration command.
5. Confirm tables are created.
6. Confirm no demo businesses or demo users exist.

Expected outcome:

- The production database contains schema tables only.
- No demo, test, phase, smoke, or pilot records exist.
- The only account should be the first System Administrator after administrator setup.

Stop if:

- Demo businesses appear.
- Test users appear.
- The database URL points to development or pilot.

## 3. Domain Configuration

Goal: point the public domain to the production server.

Checklist:

- [ ] Choose the production domain.
- [ ] Configure DNS records with the hosting provider.
- [ ] Confirm the domain points to the correct production server.
- [ ] Confirm no domain points to a local machine.
- [ ] Configure `APP_URL`.
- [ ] Configure `NEXT_PUBLIC_APP_URL`.
- [ ] Configure `BASE_URL` if used.

Exact verification steps:

1. Open the production domain in a browser.
2. Confirm it loads Loyalty Card UAE.
3. Open `/login`.
4. Confirm the login page loads.
5. Open a customer card link after a test customer is created.

Expected outcome:

- The domain loads the production app.
- Login page uses the real domain.
- Customer card and referral links use the real domain.

Stop if:

- The domain shows a hosting default page.
- The app generates links with localhost or a development domain.

## 4. SSL Setup

Goal: ensure all production traffic uses HTTPS.

Checklist:

- [ ] Enable SSL certificate for the production domain.
- [ ] Confirm HTTPS works.
- [ ] Confirm HTTP redirects to HTTPS.
- [ ] Confirm browser shows a valid lock icon.
- [ ] Confirm scanner and camera pages are accessed over HTTPS.

Exact verification steps:

1. Open the production domain using `https://`.
2. Confirm the browser does not show a certificate warning.
3. Open `/staff/scanner`.
4. Confirm the browser allows camera permission prompts.

Expected outcome:

- HTTPS is active.
- Camera scanner can request camera permission.
- No browser security warning appears.

Stop if:

- SSL is invalid.
- Camera access is blocked because the page is not secure.

## 5. Administrator Creation

Goal: create the first System Administrator safely.

Checklist:

- [ ] Create one System Administrator account.
- [ ] Use the production administrator email.
- [ ] Generate a strong temporary password outside the repository.
- [ ] Store the temporary password securely.
- [ ] Log in once as the System Administrator.
- [ ] Change the password immediately if password change is available.
- [ ] Confirm no other users exist before onboarding the first business.

Recommended first account:

- Email: `admin@yourdomain.com`
- Password: generated temporary password

Exact verification steps:

1. Open `/login`.
2. Sign in as the System Administrator.
3. Confirm the Platform Operations Center opens.
4. Open system users.
5. Confirm only approved production accounts exist.

Expected outcome:

- System Administrator can log in.
- No demo, test, or local accounts exist.
- Administrator has access to platform pages.

Stop if:

- Login fails.
- Unexpected demo users exist.
- The account shows a development role label.

## 6. First Business Onboarding

Goal: create the first pilot business cleanly.

Checklist:

- [ ] Collect business name.
- [ ] Collect business type.
- [ ] Collect owner name and email.
- [ ] Collect branch name and location.
- [ ] Choose subscription plan.
- [ ] Add branding colors and logo if available.
- [ ] Create the business from the System Administrator area.
- [ ] Create the Business Owner account.
- [ ] Confirm subscription status is active or trial.

Exact verification steps:

1. Sign in as System Administrator.
2. Open Businesses.
3. Create the pilot business.
4. Open the business detail page.
5. Confirm business, branch, owner, plan, and subscription appear correctly.

Expected outcome:

- First business is created.
- Business Owner account exists.
- First branch exists.
- Subscription status is correct.

Stop if:

- Business owner cannot log in.
- Branch is missing.
- Subscription is missing or inactive.

## 7. First Loyalty Program Setup

Goal: create the first loyalty program for the pilot business.

Checklist:

- [ ] Sign in as Business Owner.
- [ ] Open Loyalty Programs.
- [ ] Create the first program.
- [ ] Choose required stamps.
- [ ] Choose starting bonus stamps.
- [ ] Enter reward name.
- [ ] Activate the program.
- [ ] Confirm program appears on dashboard.

Suggested pilot program:

- Program: Coffee Club, Meal Rewards, or Haircut Club
- Required stamps: 10 to 12
- Starting bonus stamps: 0 to 2
- Reward: simple free item or service

Exact verification steps:

1. Open the Business Owner dashboard.
2. Open Loyalty Programs.
3. Create a program.
4. Open the program detail page.
5. Confirm status is active.

Expected outcome:

- Program is active.
- Program limits respect the subscription plan.
- Customers can be enrolled into the program.

Stop if:

- Program cannot be created.
- Program does not appear on customer card.

## 8. Staff Training

Goal: ensure staff can use the platform during daily operations.

Checklist:

- [ ] Create Branch Manager account.
- [ ] Create Staff account.
- [ ] Give each user their own login.
- [ ] Train staff to open the scanner.
- [ ] Train staff to enroll a customer.
- [ ] Train staff to issue one stamp.
- [ ] Train staff to issue multiple stamps with a reason.
- [ ] Explain that staff cannot redeem rewards.
- [ ] Explain wrong-business QR messages.
- [ ] Explain invalid QR messages.

Exact verification steps:

1. Ask staff to log in.
2. Ask staff to open scanner.
3. Ask staff to enroll a sample customer.
4. Ask staff to scan the customer card.
5. Ask staff to issue one stamp.
6. Ask staff to issue two stamps and enter a reason.

Expected outcome:

- Staff can complete normal stamp flow.
- Staff understands error messages.
- Staff knows when to call a manager.

Stop if:

- Staff cannot log in.
- Staff cannot open scanner.
- Staff cannot issue stamps.

## 9. Device QA Execution

Goal: verify the app works on real devices before customers use it.

Checklist:

- [ ] Test desktop Chrome.
- [ ] Test desktop Edge or Firefox.
- [ ] Test Android Chrome.
- [ ] Test iPhone Safari.
- [ ] Test staff scanner on a real phone.
- [ ] Test camera permission granted.
- [ ] Test camera permission denied.
- [ ] Test printed QR code.
- [ ] Test QR code from another phone screen.
- [ ] Test wrong-business QR if available.
- [ ] Test disabled QR if available.

Exact verification steps:

1. Open the staff scanner on Android.
2. Scan a customer QR.
3. Repeat on iPhone Safari.
4. Open the public customer card on mobile.
5. Confirm layout has no horizontal scrolling.

Expected outcome:

- Scanner works on pilot devices.
- Customer card is easy to read on mobile.
- Stamp issuance page is usable on mobile.

Stop if:

- Scanner cannot access the camera.
- QR scanning is unreliable on the business device.
- Customer card layout breaks on mobile.

## 10. Backup Verification

Goal: prove the production data can be recovered.

Checklist:

- [ ] Enable database backups.
- [ ] Create a manual pre-launch backup.
- [ ] Confirm backup file exists.
- [ ] Confirm backup file size is reasonable.
- [ ] Store backup outside the server.
- [ ] Document backup location.
- [ ] Confirm restore guide is accessible.
- [ ] Perform restore drill if possible.

Exact verification steps:

1. Create a database backup.
2. Confirm the backup timestamp.
3. Confirm the file is not empty.
4. If possible, restore into a temporary database.
5. Confirm the app can connect to the restored database.

Expected outcome:

- Backup exists.
- Backup can be restored or is scheduled for restore drill.
- Founder knows where backup is stored.

Stop if:

- No backup exists.
- Backup location is unknown.
- Restore procedure is not understood.

## 11. Monitoring Verification

Goal: confirm the founder can detect issues quickly.

Checklist:

- [ ] Confirm app health can be checked.
- [ ] Confirm database health can be checked.
- [ ] Confirm failed logins are tracked.
- [ ] Confirm scanner failures are visible.
- [ ] Confirm alert volume can be reviewed.
- [ ] Confirm production logs are accessible.
- [ ] Confirm support contact process exists.

Exact verification steps:

1. Open Platform Settings.
2. Review environment information.
3. Open Platform Health and Analytics.
4. Confirm database status is healthy.
5. Open Audit Center.
6. Confirm recent events are visible.

Expected outcome:

- Founder can see whether the system is healthy.
- Operational issues have a known place to check.
- Support escalation path is known.

Stop if:

- Database health is unknown.
- Logs are not accessible.
- No one is assigned to monitor launch day.

## 12. Go-Live Day Procedure

Goal: launch the pilot in a controlled way.

Checklist:

- [ ] Confirm production URL works.
- [ ] Confirm System Administrator login works.
- [ ] Confirm Business Owner login works.
- [ ] Confirm Branch Manager login works.
- [ ] Confirm Staff login works.
- [ ] Confirm first customer can be enrolled.
- [ ] Confirm customer card opens.
- [ ] Confirm QR scanner works.
- [ ] Confirm one stamp can be issued.
- [ ] Confirm reward-ready behavior works when target is reached.
- [ ] Confirm support contact is available.

Suggested launch order:

1. Founder verifies platform health.
2. Business Owner verifies dashboard.
3. Branch Manager verifies scanner.
4. Staff enrolls one internal test customer.
5. Staff issues one stamp.
6. Business serves first real customer.
7. Founder monitors alerts and logs for the first hour.

Expected outcome:

- First real customer can be enrolled.
- First real stamp can be issued.
- Business staff can operate without founder intervention.

Stop if:

- Scanner fails.
- Staff cannot log in.
- Customer card does not load.

## 13. First-Week Support Procedure

Goal: support the pilot business closely during the first week.

Checklist:

- [ ] Assign one support owner.
- [ ] Create daily check-in time.
- [ ] Collect staff feedback daily.
- [ ] Review failed scans daily.
- [ ] Review suspicious alerts daily.
- [ ] Review customer enrollments daily.
- [ ] Review stamp transactions daily.
- [ ] Review reward redemptions daily.
- [ ] Record issues in a shared issue log.
- [ ] Classify issues by severity.

Daily support questions:

1. Did staff log in successfully?
2. Did the scanner work?
3. Did customers understand the card?
4. Were stamps issued correctly?
5. Did any alerts appear?
6. Did any customer complain or get confused?
7. What should be improved before wider launch?

Expected outcome:

- Issues are found early.
- Staff feels supported.
- Founder has real usage feedback.

Stop if:

- Critical issue repeats twice.
- Staff stops using the system.
- Customers cannot access cards.

## 14. Pilot Success Metrics

Goal: measure whether the pilot is successful.

Checklist:

- [ ] Track businesses onboarded.
- [ ] Track branches onboarded.
- [ ] Track staff trained.
- [ ] Track customers enrolled.
- [ ] Track QR scans completed.
- [ ] Track stamps issued.
- [ ] Track rewards ready.
- [ ] Track rewards redeemed.
- [ ] Track referrals created.
- [ ] Track referrals qualified.
- [ ] Track support issues.
- [ ] Track critical incidents.

Suggested first pilot targets:

- 1 business onboarded
- 1 to 2 branches active
- 3 to 5 staff trained
- 50 customers enrolled
- 100 stamps issued
- 5 rewards ready or redeemed
- 0 unresolved critical incidents

Expected outcome:

- Pilot has measurable adoption.
- Founder can decide whether to continue, pause, or expand.

Stop if:

- Metrics are not being tracked.
- Staff usage remains low after training.
- Critical issues remain unresolved.

## 15. Pilot Completion Review

Goal: decide whether Loyalty Card UAE is ready for more customers.

Checklist:

- [ ] Review pilot goals.
- [ ] Review usage metrics.
- [ ] Review support issues.
- [ ] Review customer feedback.
- [ ] Review staff feedback.
- [ ] Review business owner feedback.
- [ ] Review technical incidents.
- [ ] Review missing features.
- [ ] Decide go, pause, or rework.

Review questions:

1. Did the business use Loyalty Card UAE daily?
2. Did customers understand digital stamp cards?
3. Did staff find scanning easy?
4. Did rewards work correctly?
5. Did alerts help or confuse the business?
6. Did the founder need to manually intervene too often?
7. What must be fixed before the second pilot?

Expected outcome:

- Clear go/no-go decision.
- Prioritized improvement list.
- Recommendation for next pilot business.

Completion decision:

- Go: expand to another pilot business.
- Pause: fix high-priority workflow issues first.
- Stop: product is not ready for real business use.

## Final Founder Sign-Off

Complete before first public pilot day:

- [ ] Production server verified.
- [ ] Production database verified.
- [ ] Domain and SSL verified.
- [ ] System Administrator verified.
- [ ] First business onboarded.
- [ ] First loyalty program active.
- [ ] Staff trained.
- [ ] Real-device QA completed.
- [ ] Backup verified.
- [ ] Monitoring verified.
- [ ] Support owner assigned.
- [ ] Go-live decision approved.

Founder approval:

- Name:
- Date:
- Decision: Go / Pause / No-Go
- Notes:

