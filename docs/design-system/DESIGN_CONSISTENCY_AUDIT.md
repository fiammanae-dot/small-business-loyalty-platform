# Design Consistency Audit

## Spacing

Findings:
- Authenticated pages mostly use `p-4`, `p-5`, `gap-4`, and `rounded-md`, but some older dense pages use custom inline spacing.
- Platform pages are more consistent after recent mobile work than operational pages.
- Customer 360, scanner result, public card, and dashboard have the most layout-specific spacing.

Recommendation:
- Define spacing tokens for page shell, section card, compact table row, mobile card, and sticky action areas.

## Typography

Findings:
- Page titles are standardized by `DashboardShell` for authenticated pages.
- Section headings vary between `text-lg`, `text-xl`, and large local display sizes.
- Public homepage typography is intentionally more marketing-oriented.
- Some detail pages under `/platform/users/[id]` and `/platform/users/[id]/edit` are compressed into very dense source and should be normalized.

Recommendation:
- Define heading scale: page title, section title, card title, field label, metadata text.

## Buttons

Findings:
- Primary orange/platform buttons exist across admin pages.
- Operational business buttons increasingly use business theme utilities.
- Danger buttons vary between red outline, red text, and confirmation submit styles.
- Some action links remain styled as text or compact buttons depending on page.

Recommendation:
- Standard button variants: primary, secondary, outline, ghost, danger, success, branded-primary, compact-icon.
- Shared action menu should own row action styling.

## Icons

Findings:
- Lucide icons are used widely.
- System Administrator remains LoyaltyBase orange.
- Operational roles mostly use business theme utilities, but icon color drift is likely in older pages.
- Decorative public page icons should consistently use `aria-hidden`.

Recommendation:
- Icon color policy: semantic danger/success/warning/neutral, platform brand, business brand.

## Colors

Findings:
- Platform uses LoyaltyBase orange (`#F97316`, `#EA580C`) heavily.
- Operational UI uses CSS business variables and classes (`business-text`, `business-bg`, etc.) in many places.
- Semantic amber/orange sometimes overlaps with brand orange, making audits harder.

Recommendation:
- Separate brand tokens from semantic warning tokens.
- Keep `/platform/*` on platform orange; operational roles use business variables.

## Shadows And Borders

Findings:
- Most cards use `border border-[#E5E7EB] bg-white shadow-sm`.
- Some public cards use richer shadows and larger radii.
- Cards in operational dashboards can feel heavier due repeated nested panels.

Recommendation:
- Define `surface-card`, `surface-panel`, `surface-subtle`, and `surface-floating` patterns.

## Border Radius

Findings:
- Product UI mostly uses `rounded-md` or `rounded-lg`.
- Public card/marketing uses larger premium radii.
- Mobile bottom sheets use rounded top corners.

Recommendation:
- Keep product cards at 6-8px except public/marketing and bottom sheets.

## Dialogs And Drawers

Findings:
- `MobileFilterDrawer` standardizes platform mobile filters.
- More menus are bottom sheets in role navigation.
- Confirmation uses `ConfirmSubmitButton` pattern, but not all modals/actions share the same wrapper.

Recommendation:
- Shared dialog primitives: confirm, mobile bottom sheet, filter drawer.

## Cards

Findings:
- Cards are the dominant layout unit.
- Some pages have many cards stacked vertically, especially Customer 360 and Billing Center.
- Mobile cards are good but duplicate table content patterns.

Recommendation:
- Use cards for individual records and critical summaries, not every page section.
- Favor tabs/accordions for secondary detail.

## Tables

Findings:
- Platform tables have been simplified and paired with mobile cards.
- Operational customer/staff tables are improved but still page-local.
- Desktop row actions vary by page.

Recommendation:
- Standard table density and action column patterns.

## Forms

Findings:
- Forms use Tailwind inputs directly.
- `SearchableCombobox` and `BranchLocationFields` improve complex selectors.
- Focus rings vary between orange, business branded, and browser defaults.

Recommendation:
- Shared form field components with label, helper, error, focus ring, and mobile spacing.

## Tabs

Findings:
- Customer 360 and settings pages use tabbed sections.
- Mobile selectors are used for settings but not universally.

Recommendation:
- Standard tab-to-mobile-select behavior for pages with more than 4 tabs.

## Consistency Score

Current consistency score: 72/100.

Strongest areas:
- Platform mobile shell/navigation.
- Platform filters/KPI grids.
- Authenticated shell structure.

Weakest areas:
- Local status/action/card implementations.
- Progress bar duplication.
- Mixed button styles in high-density tables.
