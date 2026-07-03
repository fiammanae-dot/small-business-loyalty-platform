# Scalability UX Dropdown Audit

Phase 13G audit of dynamic selectors that can become unusable as Loyalty Card UAE scales.

## Summary

Dynamic record dropdowns should use searchable comboboxes instead of native select controls when the option list can grow beyond a small enum. The shared `SearchableCombobox` now supports search, keyboard navigation, clear selection, loading and empty states, scroll-limited results, primary/secondary labels, badges, and disabled items.

## Audited Dropdowns

| Page | Field | Data source | Expected growth risk | Recommendation / status |
| --- | --- | --- | --- | --- |
| `/platform/businesses` | Plan filter | `subscription_plans` | Medium as plans grow | Replaced with searchable combobox |
| `/platform/businesses/new` | Subscription plan | `subscription_plans` | Medium | Replaced with searchable combobox |
| `/platform/businesses/[id]/edit` | Subscription plan | `subscription_plans` | Medium | Replaced through shared business form |
| `/platform/users` | Business filter | `businesses` | High at 100+ businesses | Replaced with searchable combobox |
| `/platform/users` | Branch filter | `branches` | High at 500+ branches | Replaced with searchable combobox |
| `/platform/subscriptions` | Plan filter | `subscription_plans` | Medium | Replaced with searchable combobox |
| `/platform/invoices` | Business filter | `businesses` | High | Replaced with searchable combobox |
| `/platform/invoices` | Plan filter | `subscription_plans` | Medium | Replaced with searchable combobox |
| `/platform/invoices/new` | Business selector | `businesses` | High | Replaced with searchable combobox |
| `/platform/invoices/new` | Subscription selector | `business_subscriptions` | High at 1,000+ subscriptions | Replaced with searchable combobox |
| `/platform/audit-center` | Business filter | `businesses` | High | Replaced with searchable combobox |
| `/platform/audit-center` | Branch filter | `branches` | High | Replaced with searchable combobox |
| `/platform/billing-center` | Business filter | `businesses` | High | Replaced with searchable combobox |
| `/platform/billing-center` | Plan filter | `subscription_plans` | Medium | Replaced with searchable combobox |
| `/platform/tenant-center` | Plan filter | `subscription_plans` | Medium | Replaced with searchable combobox |
| `/dashboard/staff` | Branch assignment | `branches` | High for multi-branch tenants | Replaced with searchable combobox |
| `/dashboard/customers/new` | Card issued branch | `branches` | High for multi-branch tenants | Replaced with searchable combobox |
| `/dashboard/programs/[id]/customers` | Customer selector | `business_customer_memberships` | Very high at 10,000+ customers | Replaced with searchable combobox |
| `/branch/programs/[id]/customers` | Customer selector | `business_customer_memberships` | Very high | Replaced with searchable combobox |
| `/dashboard/notifications` | Assigned user filter | `users` | Medium to high | Replaced with searchable combobox |
| `/dashboard/notifications` | Branch filter | `branches` | High | Replaced with searchable combobox |
| `/dashboard/notifications` | Assign owner action | `users` | Medium to high | Replaced with searchable combobox |
| `/dashboard/engagement` | Branch filter | `branches` | High | Replaced with searchable combobox |
| `/dashboard/engagement` | Program filter | `loyalty_programs` | Medium to high | Replaced with searchable combobox |

## Remaining Native Selects

The remaining native selects are small enum selectors such as status, severity, direction, date ranges, roles, channels, payment method, and active/inactive states. These are intentionally left as native controls because the option count is bounded and predictable.

## Next Recommendations

- Add server-side remote search endpoints for customer and subscription selectors before exceeding 10,000 records per tenant.
- Add true list virtualization if selectors regularly exceed 500 visible matched records.
- Add pagination-backed selectors for audit events and alerts if direct entity selection is introduced later.
