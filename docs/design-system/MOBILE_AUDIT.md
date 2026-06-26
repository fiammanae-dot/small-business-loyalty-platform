# Mobile Audit

## Overall Mobile Status

Mobile score: 76/100.

The product has strong mobile foundations: role bottom nav, mobile filter drawer, mobile cards for many platform tables, scanner-first workflows, and public card/referral pages designed for phones. The remaining mobile risk is concentrated in oversized detail pages, local tables, long settings pages, and pages that still combine too many sections vertically.

## System Administrator Pages

| Page | Mobile status | Issues | Recommendation |
|---|---|---|---|
| `/platform` | Responsive | KPI density is acceptable | Keep 2-column KPIs |
| `/platform/businesses` | Responsive | Complex filters, many row actions | Keep drawer + mobile cards |
| `/platform/businesses/[id]` | Responsive | Many sections; invoice/history density | Continue card/accordion pattern |
| `/platform/plans` | Responsive | Plan table can still be dense | Use mobile cards for comparison if redesigning |
| `/platform/subscriptions` | Responsive | Many lifecycle details | Keep summary columns + expandable details |
| `/platform/invoices` | Responsive | Invoice action density | Keep visible View + More actions |
| `/platform/users` | Responsive | High-risk actions; status filters | Keep compact action menu/card pattern |
| `/platform/audit-center` | Responsive | Below-export audit event volume can be long | Keep mobile cards and filters drawer |
| `/platform/billing-center` | Responsive | Still long despite tabs/accordions | Keep tab structure; split sections only visually |
| `/platform/tenant-center` | Responsive | Directory filters/list can grow | Keep mobile filters and cards |
| `/platform/health-analytics` | Needs improvement | Charts/exports can be wide | Use accordions and responsive chart containers |
| `/platform/settings` | Responsive | Selector spacing improved, but page still broad | Keep mobile selector and no horizontal overflow |
| `/platform/database` | Responsive | Technical text can wrap | Ensure break words for URLs/technical strings |
| `/platform/launch-readiness` | Responsive | Checklist length | Add section anchors only if needed |

## Business Owner Pages

| Page | Mobile status | Issues | Recommendation |
|---|---|---|---|
| `/dashboard` | Responsive | Can still feel tall; search/business summary/cards stacked | Prioritize scanner, KPIs, recent activity |
| `/dashboard/customers` | Responsive | Desktop table improved; mobile cards should remain | Keep mobile cards; no wide tables |
| `/dashboard/customers/[id]` | Needs improvement | Customer 360 remains long | Keep sticky summary, tabs, compact overview |
| `/dashboard/programs` | Responsive | Program cards can duplicate metrics | Standardize program card |
| `/dashboard/referrals` | Needs improvement | Data-heavy reporting | Use cards and collapsible details |
| `/dashboard/scanner` | Critical mobile workflow | Must remain 3-5 second cashier flow | Keep primary actions above fold |
| `/dashboard/settings` | Responsive | Many sections | Mobile selector is correct |
| `/dashboard/staff` | Responsive | Action buttons in table/card | Keep compact buttons |
| `/dashboard/branches` | Responsive | Branch cards can grow | Keep cards compact |
| `/dashboard/billing` | Responsive | Admin/account data is secondary | Keep concise |

## Branch Manager Pages

| Page | Mobile status | Issues | Recommendation |
|---|---|---|---|
| `/branch` | Responsive | Supervisor info could get long | Keep staff activity compact |
| `/branch/customers` | Responsive | Search/results need touch clarity | Keep customer cards |
| `/branch/programs` | Responsive | Program performance data density | Use compact program cards |
| `/branch/scanner` | Critical mobile workflow | Same scanner constraints as Business Owner | Keep camera + universal lookup |

## Staff Pages

| Page | Mobile status | Issues | Recommendation |
|---|---|---|---|
| `/staff` | Responsive | Must stay operational-first | Keep scanner prominent |
| `/staff/scanner` | Critical mobile workflow | No extra content above actions | Keep short instructions |
| `/staff/customers` | Responsive | Read-only profile access must be clear | Keep cards and no management actions |
| `/staff/customers/new` | Responsive | Form length | Group referral optional field clearly |
| `/staff/customers/success` | Responsive | Share/copy actions | Keep large tap targets |
| `/staff/programs` | Responsive | Read-only programs | Keep simple cards |

## Public Pages

| Page | Mobile status | Issues | Recommendation |
|---|---|---|---|
| `/` | Responsive | Hero can become visually busy | Keep motion subtle |
| `/benefits` | Responsive | Long text | Use section rhythm |
| `/request-demo` | Responsive | Form length | Keep labels and touch fields large |
| `/card/[token]` | Mobile first | Public card is high impact | Keep QR visible and reduce duplicate data |
| `/referral/[code]` | Mobile first | QR must remain primary | Keep customer-friendly wording |

## Horizontal Scrolling Risk

Highest risk files:
- `src/app/dashboard/customers/[id]/page.tsx`
- `src/app/platform/health-analytics/page.tsx`
- `src/app/platform/billing-center/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/scan/[token]/page.tsx`

Common causes:
- Long emails, URLs, tokens, color values.
- Desktop tables without mobile card alternatives.
- Flex children missing `min-w-0`.
- Wide charts/export sections.

## Touch Target Audit

Good:
- Mobile bottom navigation.
- More bottom sheets.
- Scanner action buttons.
- Public card/referral actions.

Needs review:
- Small row actions in dense tables.
- Inline text links in older detail pages.
- Some compact action menus on mobile cards.

## Safe Area Support

Good:
- Mobile bottom nav safe-area padding exists.
- More bottom sheets have safe-area spacing.

Recommendation:
- Keep bottom padding on mobile content for pages with fixed nav.
