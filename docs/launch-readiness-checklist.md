# Loyalty Card UAE Launch Readiness Checklist

Version: 1.0

Status values: Pass, Fail, Unknown.

## Infrastructure

| Item | Status | Notes | Recommendation |
|---|---|---|---|
| Production host configured | Unknown | Vercel/Neon setup exists outside repo context | Verify production env variables |
| Domain configured | Unknown | Needs live DNS verification | Confirm DNS and HTTPS |
| SSL enabled | Unknown | Must be verified in hosting | Test production URL |
| Build passes | Pass | Recent build passed | Keep CI build gate |

## Database

| Item | Status | Notes | Recommendation |
|---|---|---|---|
| Migrations exist | Pass | Prisma migrations present | Run deploy on target DB |
| Production DB clean | Unknown | Requires target DB audit | Confirm before pilot |
| Backups documented | Pass | Operations docs exist | Practice restore drill |
| Immutable stamp/redemption records | Pass | DB protections exist | Keep trigger tests |

## Authentication and Roles

| Item | Status | Notes | Recommendation |
|---|---|---|---|
| Session secret required in production | Pass | Fail-closed behavior implemented | Verify env |
| Role redirects | Pass | Tests cover role routing | Smoke test in browser |
| Idle logout | Pass | 15-minute idle timeout added | Verify manually |
| Password reset for staff | Pass | Business-scoped | Confirm UX |

## Plans and Billing

| Item | Status | Notes | Recommendation |
|---|---|---|---|
| Three-plan system | Pass | Starter/Growth/Multi Branch | Verify production seed |
| Plan limits enforced | Pass | Branch/program actions enforce limits | Live UAT |
| Billing Center | Pass | UI exists | Real billing process validation needed |
| Payment provider | Unknown/Future | Manual/payment records only | Define commercial process |

## Customers, Programs, Referrals, Scanner

| Item | Status | Notes | Recommendation |
|---|---|---|---|
| Customer create/search | Pass | Normalized UAE phones | Pilot UAT |
| Loyalty programs | Pass | Limits and rewards implemented | Pilot UAT |
| QR scanner | Pass/Device-dependent | Camera API varies by browser | Real iPhone/Android QA |
| Reward redemption | Pass | Permissions and immutability covered | Pilot UAT |
| Referrals | Pass | First-stamp qualification | Pilot UAT |
| Tiers | Pass | Visit-based Bronze/Silver/Gold/VIP | Pilot UAT |

## Reports, Monitoring, Security

| Item | Status | Notes | Recommendation |
|---|---|---|---|
| CSV exports | Pass | Business scoped | Verify sample export |
| Audit Center | Pass | UI and audit events | Review PII policy |
| Alert engine | Pass | Risk/lifecycle/dedupe | Tune thresholds in pilot |
| Monitoring | Partial | Documentation exists | Add live uptime/error monitoring |
| Device QA | Unknown | Requires real devices | Run device checklist |

## Launch Score

- Development completion: 90%
- Pilot readiness: 82%
- Commercial readiness: 70%
- Production readiness: 72%

Recommended verdict: Pilot-ready after production environment, backup, and real-device scanner verification.

