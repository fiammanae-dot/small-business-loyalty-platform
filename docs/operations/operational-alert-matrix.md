# Operational Alert Matrix

The alert matrix defines when operations should be notified, how quickly alerts should be acknowledged, and who should be escalated.

| Alert | Severity | Example trigger | Response target | Escalation path |
| --- | --- | --- | --- | --- |
| Site unavailable | Critical | Public availability check fails twice from multiple locations. | 15 minutes | Operations lead, engineering lead, system administrator. |
| Database unavailable | Critical | Application cannot connect to database or health check fails repeatedly. | 15 minutes | Operations lead, database owner, system administrator. |
| Authentication unavailable | Critical | Login fails for all tested roles or session creation fails globally. | 15 minutes | Operations lead, security owner, engineering lead. |
| Security incident suspected | Critical | Suspicious admin access, credential stuffing, or privilege misuse pattern. | 15 minutes | Security owner, system administrator, engineering lead. |
| Billing provider outage or billing integrity risk | Critical | Payments/webhooks fail broadly or subscription states mismatch provider records. | 15 minutes | Operations lead, finance owner, system administrator. |
| Backup unavailable | Critical | No usable backup exists inside recovery point objective. | 15 minutes | Operations lead, database owner, system administrator. |
| Failed production deployment | Critical | Deployment fails after production traffic is affected. | 15 minutes | Engineering lead, operations lead, system administrator. |
| Failed migration | Critical | Migration fails or leaves application in incompatible state. | 15 minutes | Engineering lead, database owner, system administrator. |
| High scanner failures | High | Scanner failures exceed 5% over 10 minutes or one tenant has repeated failures. | 30 minutes | Support lead, operations lead, engineering lead. |
| Repeated cooldown violations | Medium | Tenant cooldown violations exceed baseline by 3x. | 1 business day | Support lead, operations review, engineering if confirmed defect. |
| Excessive alert generation | Medium | Alert volume doubles baseline or creates repeated non-actionable alerts. | 1 business day | Operations lead. |
| Failed background jobs | High | Same launch-critical job fails repeatedly in 15 minutes. | 30 minutes | Operations lead, engineering lead. |
| Failed backups | High | Latest scheduled backup fails but previous valid backup remains within RPO. | 30 minutes | Operations lead, database owner. |
| Slow database queries | Medium | Repeated queries exceed 5 seconds or p95 latency exceeds baseline. | 1 business day | Engineering lead, database owner. |
| Failed logins spike | High | Failed login rate exceeds baseline by 3x, especially for admin accounts. | 30 minutes | Security owner, operations lead. |
| Open Critical alert not acknowledged | Critical | Critical alert remains unacknowledged beyond target. | Immediate escalation | System administrator. |
| SSL certificate expiring | High | Certificate expires within 14 days. | 1 business day | Hosting/domain owner, operations lead. |
| Domain expiry risk | High | Domain expires within 30 days. | 1 business day | System administrator, domain owner. |
| Storage nearing capacity | High | Disk or database storage exceeds 85%. | 30 minutes | Operations lead, hosting owner. |
| Single recoverable application error | Low | Isolated handled exception with no user impact. | Weekly review | Engineering triage. |

## Alert Handling Rules

- Critical alerts must page or otherwise interrupt the assigned responder.
- High alerts should notify operations during active support hours and escalate if repeated.
- Medium alerts should create review tasks or dashboard attention.
- Low alerts should be aggregated and reviewed for trends.
- Any alert with customer data, payment impact, access impact, or audit integrity impact should be promoted if uncertainty remains.
