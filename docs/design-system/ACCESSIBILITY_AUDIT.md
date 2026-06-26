# Accessibility Audit

## Overall Accessibility Score

Current score: 70/100.

The application has a usable accessibility baseline: semantic forms, real buttons in many dialogs, visible labels in most forms, and keyboard-friendly native controls. The main gaps are inconsistent focus rings, icon-only/action controls without standardized labels, custom mobile sheets needing consistent ARIA behavior, and repeated local components with uneven semantics.

## ARIA And Semantics

Strengths:
- Most forms use native inputs/selects/buttons.
- Confirmation actions use real submit buttons through `ConfirmSubmitButton`.
- Public and auth pages use clear textual CTAs.

Risks:
- Some icon-only buttons/actions may need explicit `aria-label`.
- More/menu bottom sheets should consistently expose dialog semantics, title, close button label, and focus behavior.
- Decorative icons in marketing/public pages should consistently use `aria-hidden`.

Recommendation:
- Add an accessibility checklist to each redesign PR: labels, roles, focus, escape/close behavior, reduced motion.

## Keyboard Navigation

Strengths:
- Native links/buttons are widely used.
- Forms remain keyboard-submittable.

Risks:
- Custom bottom sheets/drawers may not trap or return focus.
- Action menus need predictable tab order and close-on-selection behavior.
- Table row More actions should be reachable without mouse.

Recommendation:
- Standardize drawer/menu/dialog primitives before redesigning many pages.

## Focus Rings

Findings:
- Focus styles vary across inline Tailwind classes.
- Some operational pages use business theme focus colors; platform pages use orange.
- Some compact links/buttons may rely on browser default only.

Recommendation:
- Define `focus-visible` classes for primary, secondary, danger, branded, and neutral controls.

## Contrast

Strengths:
- Text colors mostly use dark slate/gray on white.
- Danger/success/warning states generally semantic.

Risks:
- Business branding can be extreme; text/button colors may fail contrast if raw business colors are used without safeguards.
- Light orange backgrounds with orange text can be borderline depending on shade.

Recommendation:
- Add contrast guardrails for business branding variables.
- Use semantic text colors on soft backgrounds unless contrast is guaranteed.

## Button Labels

Strengths:
- Most buttons use clear text.
- Scanner actions are explicit.

Risks:
- Row actions in compact menus can become ambiguous if icon-only.
- Public card share actions should keep visible text for customers.

Recommendation:
- No icon-only primary actions in daily workflows unless the icon is universal and has a label/tooltip.

## Heading Hierarchy

Findings:
- `DashboardShell` gives clear page titles.
- Some pages start with additional `h2` blocks immediately after the shell, which can feel duplicated.
- Public pages use marketing hierarchy correctly.

Recommendation:
- Keep one `h1`/main page title from shell; use `h2` for content sections.

## Empty States

Findings:
- Many local empty states exist and generally explain the missing records.
- Style and actions vary.

Recommendation:
- Shared `EmptyState` should include optional icon, title, explanation, primary action, and secondary action.

## Loading States

Findings:
- Few explicit loading skeletons were found in route files.
- Most pages are server-rendered and show completed data.

Recommendation:
- Add route-level loading states selectively for heavy platform pages and scanner pages only if users experience delay.

## Motion And Reduced Motion

Findings:
- Homepage uses motion components.
- Product UI is mostly low motion.

Recommendation:
- Preserve reduced-motion handling in public pages.
- Avoid heavy animation in scanner and admin pages.

## Accessibility Priority Fixes

1. Standardize focus-visible styles for all buttons/links/form fields.
2. Add ARIA semantics/focus management to mobile drawers and More sheets.
3. Ensure icon-only controls have accessible names.
4. Add contrast checks for business branding themes.
5. Create shared `EmptyState` and `ActionMenu` primitives with accessibility baked in.
