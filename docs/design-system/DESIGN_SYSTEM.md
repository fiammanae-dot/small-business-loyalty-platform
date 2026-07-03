# Loyalty Card UAE Design System

This is the official UI foundation for Milestone 3 redesign work. It is based on the Sprint 0 Milestone 1 audit and intentionally avoids business logic, database access, permissions, scanner logic, billing logic, and referral logic.

## Design Principles

- Operational first: daily actions should be obvious and close to the top of the page.
- Mobile first: scanner, customer lookup, enrollment, and public card flows must work cleanly on phone screens.
- Premium but quiet: white surfaces, restrained shadows, compact spacing, strong hierarchy.
- Business branding where appropriate: Business Owner, Branch Manager, and Staff surfaces use business theme utilities; System Administrator remains Loyalty Card UAE orange.
- Semantic color clarity: red means danger, green means success, amber means warning, gray means neutral.

## Token Source

Tokens live in:

`src/lib/design-tokens.ts`

Token groups:

- Brand colors
- Semantic colors
- Spacing scale
- Radius scale
- Shadow scale
- Typography scale
- Focus ring style
- Transition durations
- Z-index scale
- Breakpoints

## Brand Colors

| Token | Value | Usage |
|---|---|---|
| Brand primary | `#F97316` | Loyalty Card UAE platform primary actions and highlights |
| Brand dark | `#EA580C` | Primary hover and stronger brand text |
| Brand soft | `#FFF7ED` | Soft brand backgrounds |
| Text | `#1E293B` | Main text |
| Background | `#FFFFFF` | Main surface |

## Semantic Colors

- Success: active, completed, delivered, reward-ready where positive.
- Warning: pending, expiring, needs attention.
- Danger: destructive, disabled, failed, denied.
- Info: neutral informative state.
- Neutral: inactive, archived, metadata, disabled UI.

Do not use orange as a warning color unless the meaning is truly warning and not brand.

## Typography

- Page title: strong, compact, controlled by page shell when possible.
- Section title: use for content groups.
- Card title: compact and readable.
- Labels: uppercase only for small metadata labels, not body text.

## Spacing

- Use compact spacing for operational dashboards.
- Use `p-4 md:p-5` for most product cards.
- Avoid nested card-in-card layouts unless a repeated record needs a frame.
- Add mobile bottom padding when a fixed bottom navigation is present.

## Radius And Shadow

- Product cards: `rounded-md`, `shadow-sm`.
- Public/customer-facing cards may use larger premium radii.
- Avoid decorative gradient/orb backgrounds in SaaS work surfaces.

## Accessibility Rules

- Use real buttons for actions.
- Use links only for navigation.
- Keep visible text on daily workflow buttons.
- Ensure icon-only controls have accessible labels.
- Preserve keyboard focus rings.
- Drawers/dialogs must have clear titles and close actions.
- Do not disable user zoom.

## Mobile Rules

- Tables must have mobile card alternatives or controlled horizontal scrolling.
- Filters should use a drawer on mobile for dense admin pages.
- More menus should open as bottom sheets with safe-area padding.
- Scanner actions must remain visible without excessive scrolling.

## Component Layers

1. `src/components/ui`: generic reusable primitives.
2. `src/components/domain`: Loyalty Card UAE-specific UI-only components.
3. `src/components/layouts`: page structure wrappers for future redesigns.

No component in these folders should fetch data directly.
