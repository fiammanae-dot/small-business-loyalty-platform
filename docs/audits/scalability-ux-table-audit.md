# Scalability UX Table Audit

Phase 13G audit of table surfaces that can become difficult at real operating volume.

## Summary

Large tables should provide result counts, filters, sort controls, empty states, and mobile card layouts. Where datasets can exceed a few hundred records, server-side pagination should be added before pilot expansion.

## Audited Tables

| Page | Current scale support | Expected growth risk | Recommended improvement |
| --- | --- | --- | --- |
| `/dashboard/customers` | Search, status/consent/source filters, result table, mobile cards | Very high at 10,000+ customers | Add server-side pagination and branch/program filters |
| `/dashboard/programs` | Search, status/sort filters, KPI cards, mobile cards | Medium | Add pagination if programs exceed 100 per business |
| `/dashboard/notifications` | Filters, result count, mobile cards, analytics | Very high at 50,000+ alerts | Add server-side pagination and saved filter views |
| `/dashboard/messages` | Filters, result count, mobile cards | High | Add pagination and prepared/sent date range filters |
| `/dashboard/engagement` | Filters, limited query take 100, mobile cards | High | Add result count and pagination beyond first 100 events |
| `/dashboard/programs/[id]/customers` | Enrollment table, searchable enrollment selector | High | Add pagination for enrolled customers |
| `/branch/programs/[id]/customers` | Enrollment table, searchable enrollment selector | High | Add pagination and branch-scoped activity summary |
| `/platform/businesses` | Filters, sorting, result count, mobile cards | Medium to high | Add server-side pagination before 500 tenants |
| `/platform/users` | Filters, sorting, result count, mobile cards | High at 1,000+ users | Add pagination and role-specific saved filters |
| `/platform/subscriptions` | Compact filters, result count, mobile cards | High at 1,000+ subscriptions | Add pagination and renewal date sorting |
| `/platform/invoices` | Filters, KPI cards, result count, mobile cards | High | Add pagination and due-date indexes if volume grows |
| `/platform/audit-center` | Filters, result limit, details drawer | Very high at 50,000+ audit events | Add cursor pagination and default to last 24 hours |
| `/platform/billing-center` | Many aggregate panels and tables | High | Avoid loading all subscriptions, invoices, and payments on one render at scale |
| `/platform/tenant-center` | Tenant directory and resource views | Medium to high | Add server-side pagination and tenant health pre-aggregation |
| Customer profile activity tables | Recent limits on histories | Medium | Keep bounded, add "View all" paginated history pages later |

## Priority Improvements

1. Add server-side pagination to `/dashboard/customers`, `/dashboard/notifications`, `/platform/audit-center`, and `/platform/billing-center`.
2. Convert all high-volume exports to streaming/cursor-based generation.
3. Add default date windows to audit, alert, message, and engagement pages.
4. Keep mobile card layouts for every large table.
