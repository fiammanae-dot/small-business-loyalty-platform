# Action Discoverability Audit

Phase 13G review of how quickly each operational role can find common actions.

## Business Owner

| Action | Current location | Status | Recommendation |
| --- | --- | --- | --- |
| Search Customer | Top of `/dashboard` | Good | Keep as first operational control and continue expanding result metadata |
| Add Customer | Dashboard quick action and `/dashboard/customers` | Good | Keep above the fold |
| Open Scanner | Dashboard scanner spotlight and quick action | Good | Keep visually dominant |
| Redeem Reward | Dashboard quick action and scan result flow | Good | Add direct "Reward Ready" filtered customer view later |
| View Reward Ready Customers | Dashboard KPIs and program/customer context | Partial | Add dedicated customer filter once reward status becomes queryable |
| Review Alerts | Dashboard risk cards and `/dashboard/notifications` | Good | Preserve investigation links |
| Prepare Messages | `/dashboard/engagement` and `/dashboard/messages` | Good | Keep "prepared only" banner visible |

## Branch Manager

| Action | Current location | Status | Recommendation |
| --- | --- | --- | --- |
| Open Scanner | `/branch` and `/branch/scanner` | Good | Keep scanner shortcut prominent |
| Search Customer | `/branch/customers` list and program enrollment | Partial | Add a dashboard-level branch customer search later |
| Redeem Reward | Scan result flow | Good | Keep staff restriction clear |
| Review Branch Activity | `/branch` metrics and recent scans | Partial | Add date filters as activity volume grows |

## Staff

| Action | Current location | Status | Recommendation |
| --- | --- | --- | --- |
| Open Scanner | `/staff` and `/staff/scanner` | Good | Keep as primary action |
| Manual Token Entry | `/staff/scanner` | Good | Keep visible for camera-denied cases |
| Enroll Customer | `/staff/customers/new` | Good | Keep success page card URL actions |

## System Administrator

| Action | Current location | Status | Recommendation |
| --- | --- | --- | --- |
| Create Business | `/platform` quick action and `/platform/businesses/new` | Good | Keep wizard structure |
| Create Invoice | `/platform` and `/platform/invoices/new` | Good | Searchable business/subscription selectors added |
| Monitor Audit | `/platform/audit-center` | Good | Add cursor pagination before high audit volume |
| Monitor Billing | `/platform/billing-center` | Good | Split heavy panels if data grows |

## Overall Findings

- Daily Business Owner actions are discoverable from the dashboard.
- Search and scanner are appropriately promoted.
- Branch Manager customer search is the main remaining discoverability gap.
- System Administrator operational pages are broad but will need saved views as tenant count grows.
