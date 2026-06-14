# Performance Risk Review

Phase 13G read/write review focused on pages that may become slow at realistic customer volume.

## Highest-Risk Pages

| Page | Risk | Why it matters | Recommendation |
| --- | --- | --- | --- |
| `/platform/billing-center` | High | Loads subscriptions, invoices, payments, businesses, and renders many aggregate panels | Add server-side date windows, precomputed billing summaries, and pagination |
| `/platform/audit-center` | High | Reads up to 5,000 metric audit events plus 500 table events | Add cursor pagination and aggregate audit counters |
| `/dashboard/notifications` | High | Alert rows include related customer/program/staff and per-alert transaction lookup | Batch related transaction lookup and paginate alerts |
| `/dashboard/customers` | High | Customer list can reach 10,000+ records | Add server-side pagination, branch/program filters, and indexed search paths |
| `/dashboard/messages` | Medium-high | Loads all message queue rows for a tenant before filtering in memory | Move status/channel/event filtering into Prisma query and paginate |
| `/dashboard/programs/[id]/customers` | Medium-high | Program membership list can become large | Add enrolled customer pagination and customer search |
| `/branch/programs/[id]/customers` | Medium-high | Same as Business Owner program customers | Add enrolled customer pagination |
| `/platform/tenant-center` | Medium-high | Loads all businesses with many related counts and recent audit events | Add paginated tenant directory and aggregate resource counters |
| `/platform/users` | Medium | Loads all users after filters | Add pagination at 1,000+ users |
| `/platform/businesses` | Medium | Loads all matching businesses and sorts branch counts in memory | Move sortable filters into DB where possible and paginate |

## Query Patterns To Watch

- Unbounded `findMany` followed by in-memory filtering.
- Pages that fetch every row for charts instead of aggregated time buckets.
- Per-row async lookups in notification/investigation pages.
- Export routes that load all rows before writing output.
- Audit and alert feeds without cursor pagination.

## Recommended Implementation Order

1. Add pagination helpers for server components.
2. Apply pagination to customers, alerts, audit events, invoices, subscriptions, and messages.
3. Move message and program/customer filters from in-memory filtering into Prisma where clauses.
4. Add aggregate summary tables or materialized counters for platform billing and audit metrics.
5. Introduce remote searchable selector endpoints for customer, subscription, and user lookups once individual businesses exceed 5,000 records.

## Current Phase 13G Improvements

- High-risk dynamic selectors now use searchable comboboxes.
- Program enrollment customer selectors no longer expand into long native dropdowns.
- Business Owner dashboard customer search now includes email and program-name matching and displays branch, progress, and reward context.
- Audit reports identify the remaining pagination and query risks before pilot growth.
