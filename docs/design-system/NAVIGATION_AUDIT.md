# Navigation Audit

## Global Authenticated Navigation

Primary files:
- `src/components/DashboardShell.tsx`
- `src/components/RoleNavigation.tsx`

Roles covered:
- System Administrator
- Business Owner
- Branch Manager
- Staff

Strengths:
- Role-based navigation is centralized.
- Mobile bottom navigation exists for System Administrator, Business Owner, Branch Manager, and Staff.
- Business Owner scanner is visually emphasized.
- System Administrator More menu shows active More page context.
- Business Owner More menu uses bottom-sheet pattern and active item highlighting.

Risks:
- `RoleNavigation` is high impact and carries multiple role-specific menus in one file.
- Navigation item grouping and mobile More behavior are complex enough to warrant regression tests when changed.
- Scanner emphasis can accidentally look active if not carefully styled.

## System Administrator Navigation

Desktop:
- Sidebar with platform routes.
- Hidden on mobile.

Mobile:
- Bottom nav: Dashboard, Businesses, Billing, Audit, More.
- More sheet contains Plans, Subscriptions, Invoices, Users, Analytics, Tenant Center, Settings, Database, Launch Readiness.

Status:
- Good after recent mobile polish.

Recommendations:
- Keep More sheet floating above bottom nav with safe-area spacing.
- Keep active More item visible.
- Do not add operational business links.

## Business Owner Navigation

Desktop groups:
- Main: Dashboard, Customers, Scanner, Activity.
- Management: Programs, Referrals, Staff, Branches.
- Business: Billing, Settings.
- Support: Alerts, Messages.
- Account: Profile.

Mobile:
- Dashboard, Customers, Scanner, Activity, More.
- More contains Programs, Referrals, Staff, Branches, Billing, Settings, Alerts, Messages, Profile.

Status:
- Good, but scanner/active state must remain carefully separated.

Recommendations:
- Preserve the main bottom nav as fixed and non-scrollable.
- Do not reintroduce Branding link for Business Owner.
- Keep operational routes branded by business, not platform orange.

## Branch Manager Navigation

Mobile bottom bar:
- Enroll Customer
- Scanner
- Programs

Desktop:
- Shared shell/sidebar pattern.

Status:
- Good for daily branch supervisor workflow, but Branch Manager role still benefits from clearer supervisor-specific dashboard sections.

Recommendations:
- Keep Branch Manager read-only where intended.
- Scanner and customer lookup should stay easiest to reach.

## Staff Navigation

Mobile bottom bar:
- Enroll Customer
- Scanner
- Programs

Status:
- Good cashier-focused minimal navigation.

Recommendations:
- Consider making Find Customer more prominent in dashboard content while keeping bottom nav simple.

## Breadcrumbs And Back Buttons

Findings:
- Back buttons exist in many detail pages but labels vary: Back, Return, Back to dashboard, Back to scanner.
- No global breadcrumb system.

Recommendation:
- Standardize detail page back links with destination-specific labels.
- Avoid breadcrumbs unless hierarchy becomes deeper.

## Page Titles

Findings:
- Authenticated page titles centralized through `DashboardShell`.
- Repeated generic welcome descriptions were removed previously.
- Some pages still add large local headers inside the first section.

Recommendation:
- Keep role label + page title in shell.
- Use local section headings only for page content, not repeated page intros.

## Action Placement

Findings:
- High-frequency actions are generally near page top.
- Scanner result places primary actions near top, which is correct.
- Row actions in admin tables are moving toward visible primary + More dropdown.

Recommendation:
- Standardize action hierarchy: primary visible, secondary in More, destructive confirmed.

## Quick Actions

Findings:
- Business Owner dashboard, Staff dashboard, Branch dashboard rely on quick action cards.
- Scanner should remain prominent in operational roles.

Recommendation:
- Quick action cards should share a common compact style and be actionable with clear focus/hover states.
