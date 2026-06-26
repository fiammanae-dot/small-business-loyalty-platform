# Component Library

## Core UI Components

Located in `src/components/ui`.

| Component | Purpose | Use when | Avoid when |
|---|---|---|---|
| `Button`, `ButtonLink` | Standard action/navigation buttons | Creating primary, secondary, danger, or business-branded actions | An action needs custom business logic hidden inside the component |
| `IconButton` | Accessible icon-only button | Compact tool buttons with clear `label` | The action is a primary daily workflow |
| `Card`, `CardHeader`, `CardContent`, `CardTitle` | Basic card surface | Framing a record or compact summary | Wrapping large page sections inside nested cards |
| `SectionCard` | Section container with title/actions | Reusable content block | A full page layout is needed |
| `MetricCard` | KPI/stat card with optional navigation | Numbers that may be actionable | Metrics with no clear destination should omit `href` |
| `StatusBadge` | Generic semantic status badge | Active, warning, danger, info, business, brand states | Encoding business logic in badge text |
| `PageHeader` | Standalone page header | New layouts not using `DashboardShell` | Replacing shell title without a full redesign |
| `PageActions` | Responsive action group | Header/action areas | Row-level actions needing a menu |
| `EmptyState` | Standard no-results/no-data state | Lists, tables, searches | Error states requiring recovery |
| `LoadingSkeleton` | Lightweight loading placeholder | Route or card loading | Long-term fake content |
| `ConfirmationDialog` | Accessible client confirmation foundation | UI-only callbacks or future non-form confirmations | Existing server form submissions already using `ConfirmSubmitButton` |
| `DataTable` | Desktop table shell | New management tables | Pages that already need mobile cards only |
| `SearchBar` | Standard search field | Search and lookup fields | Complex combobox selection |
| `FilterBar` | Desktop filter shell | Filter forms with page-owned query logic | Mobile-only filters |
| `ProgressBar` | Accessible progress display | Program, reward, tier, plan progress | Calculating progress inside the component |
| `Timeline`, `TimelineItem` | Activity/audit/referral timeline shell | Chronological UI | Dense tables with many columns |
| `Tooltip`, `HelperText` | Lightweight helper text | Explaining disabled actions or fields | Critical errors |
| `Avatar` | Initials/logo avatar | Customer/business/user visual identity | Sensitive identity display without authorization |
| `ActionMenu`, `ActionMenuItem` | Compact action menu shell | Secondary row actions | Destructive actions without confirmation |
| `Tabs` | Client tab primitive | Small self-contained tabbed content | Server-driven URL tabs that must persist state |

## Domain Components

Located in `src/components/domain`.

| Component | Purpose |
|---|---|
| `CustomerSummaryCard` | Compact customer identity/status summary |
| `ProgramProgressCard` | Program reward/progress summary |
| `ReferralStatusBadge` | Referral-specific status tone mapping |
| `ScannerResultCard` | Scan action summary shell |
| `CardQrTools` | QR display plus card actions |
| `StaffActionButtons` | Compact staff account action group |
| `PlanUsageCard` | Plan usage metric with progress |
| `BusinessStatusBadge` | Business lifecycle status tone mapping |

Domain components are UI-only and receive data as props. They must not query Prisma, call server actions, or infer permissions.

## Layout Components

Located in `src/components/layouts`.

| Component | Purpose |
|---|---|
| `DashboardPageLayout` | Operational dashboard spacing and mobile bottom padding |
| `ManagementPageLayout` | KPI, filter, toolbar, list layout |
| `DetailPageLayout` | Main/aside detail page shell |
| `ScannerPageLayout` | Mobile-first scanner page structure |
| `SettingsPageLayout` | Desktop tabs plus mobile selector slot |
| `PublicCardLayout` | Public card page stacking and max width |

## Export Paths

Use:

```ts
import { Button, MetricCard } from "@/components/ui";
import { ProgramProgressCard } from "@/components/domain";
import { ManagementPageLayout } from "@/components/layouts";
```

## Adoption Policy

- Milestone 2 creates foundations.
- Do not migrate high-risk pages until Milestone 3 redesign work.
- Safe migrations include badges, small buttons, empty states, and cards when no logic changes.
- Scanner and Customer 360 migrations require explicit tests.
