# LoyaltyBase Design System

Version: 1.0

## Brand Colors

| Token | Color | Usage |
|---|---|---|
| Primary Orange | `#F97316` | Primary actions, highlights, logo block |
| Dark Orange | `#EA580C` | Hover/strong emphasis |
| Background | `#FFFFFF` | Main app background |
| Text | `#1E293B` | Primary text |
| Dark UI Text | `#111827` | Headings and shell text |
| Muted Text | `#6B7280` | Supporting text |
| Border | `#E5E7EB` | Cards/tables/forms |
| Soft Orange | `#FFF7ED`, `#FFEDD5` | Highlight backgrounds |

## Typography

- Headings: semibold, tight tracking, dark text.
- Body: readable line height, muted gray for secondary copy.
- Labels: uppercase or compact semibold for metadata.
- Avoid negative letter spacing and viewport-scaled fonts.

## Spacing

- Page shell: `max-w-7xl`, responsive horizontal padding.
- Cards: compact `p-4` to `p-6`.
- Dashboard grids: `gap-4` to `gap-6`.
- Avoid large hero whitespace inside operational dashboards.

## Buttons

- Primary: orange background, white text.
- Secondary: white background, border, dark text.
- Destructive: red/critical styles only for destructive or high-risk actions.
- Icon buttons: use Lucide icons with accessible labels.

## Forms

- Inputs use rounded-md, border gray, focus orange.
- Search/filter sections should be compact.
- Large dynamic selects should use `SearchableCombobox`.
- Mutating forms should include CSRF where applicable.

## Tables

- Desktop: compact rows, badges, clear action area.
- Mobile: convert to cards where possible.
- Filters should include result count and clear filters.

## Cards

- Radius: rounded-md.
- Border: `#E5E7EB`.
- Shadow: subtle only.
- Avoid nested cards unless a repeated item or framed tool.

## Modals and Drawers

- Drawers used for investigation/detail workflows.
- Mobile drawers should become full-screen modal patterns.
- Keep metadata hidden until opened.

## Badges and Status Indicators

- Active: green.
- Inactive/Suspended/Expired: gray/red depending risk.
- Trial: blue or orange.
- Critical/High risk: red.
- Medium risk: orange.
- Low risk: green/gray.
- Tier badges: Bronze, Silver, Gold, VIP.

## Dashboard Layouts

- System Administrator: platform health, KPIs, quick actions, management modules, activity.
- Business Owner: business summary, quick actions, today performance, recent activity, customers, program performance.
- Branch Manager: branch performance and scanner actions.
- Staff: scanner-first workflow and today's activity.

## Mobile Layouts

- Stack cards vertically.
- Use 2-column KPI grids where readable.
- Keep primary actions near top.
- Avoid horizontal scroll.
- Tables should become cards.

## Inconsistencies and Improvement Opportunities

- Some pages still carry dense page-level Tailwind patterns instead of shared card primitives.
- Platform and Business dashboards use similar KPI patterns but not a formal shared component.
- Export buttons are present in several places but PDF/Excel generation may be future/manual.
- Some build output reports an obsolete `eslint` key in Next config.

