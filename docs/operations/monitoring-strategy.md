# Monitoring Strategy

Phase 13C establishes operational monitoring readiness for LoyaltyBase without changing customer-facing logic, billing behavior, permissions, scanner behavior, loyalty behavior, reward behavior, referral behavior, or database schema.

## Monitoring Principles

- Monitor service availability, data integrity, security signals, business continuity, and billing health.
- Alert only when action is required or a trend needs review.
- Prefer provider-neutral checks that can be implemented in any hosting environment.
- Keep alerts tied to a response owner, response target, and escalation path.
- Review thresholds after launch using real production baselines.

## Application Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Website availability | Detects customer and admin outage quickly. | Public health endpoint succeeds from at least two regions every 1-5 minutes. | Critical after 2 consecutive failures; escalate to operations lead. |
| HTTP 5xx rate | Indicates application errors or upstream failures. | Less than 1% of requests over 5 minutes. | High above threshold; Critical if paired with availability failure. |
| HTTP 4xx spikes | May indicate broken links, validation regressions, scanner misuse, or abuse. | Investigate when 4xx rate doubles baseline for 15 minutes. | Medium to support and operations. |
| Queue or job failures | Background work can silently stop business operations. | Zero repeated failures for the same job class within 15 minutes. | High when repeated; Critical for billing, backup, or notification jobs. |
| Deployment status | Failed releases can leave the system partially updated. | Every deployment must report success or rollback. | Critical if production deployment fails. |

## Database Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Database availability | Core platform cannot function without database access. | Connection checks pass every 1-5 minutes. | Critical immediately after repeated failure. |
| Slow queries | Performance degradation can affect scanner, admin, and billing flows. | Review queries above 1 second; alert above 5 seconds repeated. | Medium for trends; High for sustained degradation. |
| Connection usage | Exhausted connections can cause full outage. | Warning at 70%; alert at 85%; Critical at 95%. | Escalate to operations and engineering. |
| Storage capacity | Full disks can corrupt operations and backups. | Warning at 75%; High at 85%; Critical at 95%. | Escalate before capacity exhaustion. |
| Backup completion | Recovery depends on recent usable backups. | Latest backup completed within defined RPO. | High if delayed; Critical if no usable backup exists. |

## Security Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Failed login rate | Detects credential stuffing, brute force attempts, or user lockout issues. | Alert when failures exceed baseline by 3x in 15 minutes. | High to security owner; Critical if admin accounts targeted. |
| Admin login activity | Admin access has elevated operational risk. | Review all unusual location, device, or time patterns. | Medium review; High for suspicious access. |
| Permission denied spikes | May indicate probing, broken permissions, or misconfigured roles. | Alert when denial events double baseline. | Medium to security and engineering. |
| Audit log integrity | Operational and compliance review depends on trustworthy logs. | No gaps in expected audit event generation. | High if audit capture fails. |
| SSL certificate expiry | Expired certificates break trust and access. | Warning at 30 days; High at 14 days; Critical at 7 days. | Escalate to hosting/domain owner. |

## Performance Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Page response time | Slow admin workflows reduce operational effectiveness. | p95 below 2 seconds for normal pages. | Medium if sustained above threshold. |
| Scanner response time | Scanner delays directly affect customer-facing redemption/check-in flows. | p95 below 1 second for scan validation responses. | High if sustained during business hours. |
| CPU and memory | Resource exhaustion causes instability. | Warning at 70%; High at 85%; Critical at 95%. | Escalate to operations. |
| Error latency correlation | High latency can precede outage. | Investigate latency increase paired with 5xx increase. | High to engineering. |

## Business Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Loyalty actions | Detects stalled earning/redemption activity. | Alert if activity drops to near zero during expected active periods. | Medium to operations and support. |
| Reward redemptions | Confirms reward workflows remain operational. | Alert on abnormal failure spikes or unexpected zero volume. | High if customer impact is likely. |
| Referral activity | Detects referral workflow failure or abuse patterns. | Alert on repeated failed referral actions or abnormal spikes. | Medium to operations; High for suspected abuse. |
| Scanner failures | Scanner is an operational dependency for many merchants. | Alert when failures exceed 5% over 10 minutes or 10 failures for one tenant. | High to support and operations. |
| Cooldown violations | Can indicate misuse, abuse, or confusing workflows. | Alert when repeated violations exceed tenant baseline. | Medium for review; High if widespread. |

## Alert Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Open alerts by severity | Prevents unresolved incidents from being missed. | Critical alerts acknowledged within 15 minutes. | Escalate if unacknowledged past target. |
| Alert volume | Excessive alerts can hide real incidents. | Review if alerts exceed baseline by 2x. | Medium to operations. |
| Alert delivery | Alerts must reach the assigned responder. | Test delivery daily for production-critical channels. | High if delivery fails. |
| Alert noise | Low-quality alerts reduce trust. | Review alerts with no action after 3 occurrences. | Operations review weekly. |

## Billing Monitoring

| What to monitor | Why it matters | Expected threshold | Escalation recommendation |
| --- | --- | --- | --- |
| Payment failures | Revenue and access continuity depend on billing reliability. | Alert on provider-level failures or tenant-specific repeated failures. | High to operations and finance. |
| Subscription state changes | Unexpected changes can affect access and revenue. | Daily reconciliation with billing provider records. | High for mismatch. |
| Invoice generation | Missing invoices affect collections and trust. | All expected invoices generated within billing window. | High to finance operations. |
| Revenue health | Detects failed billing flows or reporting gaps. | Investigate unexpected zero revenue or sharp drop from baseline. | High to system administrator. |

