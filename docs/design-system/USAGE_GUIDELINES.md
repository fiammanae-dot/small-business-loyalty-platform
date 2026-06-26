# Usage Guidelines

## Button Hierarchy

Use one primary action per section when possible.

- Primary: the main safe action.
- Secondary/outline: navigation or non-destructive secondary action.
- Danger: destructive or access-changing actions.
- Business: operational role branded action.
- Ghost: low-emphasis secondary action.

Destructive actions must keep confirmation behavior.

## Card Rules

- Use cards for repeated records, summaries, and focused tools.
- Avoid cards inside cards.
- Keep product cards compact: `p-4 md:p-5`.
- Use `SectionCard` for a section with title/description/actions.

## Table Rules

- Desktop tables should have compact visible columns.
- Move secondary data into details or action menus.
- Mobile should use cards or an approved drawer/detail pattern.
- Action columns should not stretch row height.

## Status Rules

- Use shared badge variants first.
- Green means success/active.
- Red means danger/failure/denied.
- Amber means warning/pending.
- Gray means neutral/inactive/archived.
- Orange means LoyaltyBase brand, not status.

## Empty States

Every empty state should answer:

1. What is missing?
2. Why might it be missing?
3. What can the user do next?

Use `EmptyState` with an optional primary action.

## Loading States

Use `LoadingSkeleton` only where users are likely to wait. Do not add skeletons to every server-rendered page by default.

## Progress Bars

Use `ProgressBar` for visual progress. The page or domain logic must calculate the values. The component should only render.

## Dialogs And Confirmations

- Use existing form-backed confirmation patterns for server actions.
- Use `ConfirmationDialog` for client-only or future UI-only confirmations.
- Dialogs must have title, description, Cancel, and Confirm.

## Accessibility Checklist

Before adopting a component on a page:

- Does every button have clear text or `aria-label`?
- Is keyboard focus visible?
- Does the component work without hover?
- Does text wrap on mobile?
- Are semantic colors used correctly?
- Does the component avoid exposing internal IDs?

## Mobile Checklist

- No horizontal overflow.
- Touch targets are around 44px high.
- Fixed bottom nav pages have bottom padding.
- Drawers/bottom sheets include safe-area padding.
- Dense filters move into a drawer on mobile.

## Redesign Guardrails

- Do not combine scanner redesign with navigation redesign.
- Do not abstract business logic into UI components.
- Do not migrate Customer 360 wholesale in Milestone 2.
- Do not migrate scanner result actions without explicit scanner tests.
- Do not use new UI components to bypass permissions or server-side checks.
