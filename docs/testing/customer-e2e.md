# Customer End-to-End Journey

Expected outcome:

Customer can open their public loyalty card, view progress, and share referral link without logging in.

## Preconditions

- Customer exists.
- Business customer membership is active.
- Public card token is active.
- Customer is enrolled in at least one loyalty program.

## Journey Steps

### 1. Open Public Card

1. Open `/card/{card_token}`.

Expected:

- Page loads without login.
- Business branding appears.
- Customer name appears.
- Phone is masked.
- Internal IDs are not exposed.

### 2. View Loyalty Progress

1. Review loyalty program section.
2. Confirm progress.
3. Confirm reward name.

Expected:

- Progress uses earned plus bonus stamps.
- No stamp action exists on public card.
- Reward Ready is visible when progress reaches target.

### 3. View QR Code

1. Locate QR code for enrolled program.
2. Confirm text explains QR should be shown to staff.

Expected:

- QR encodes scan token URL.
- No database IDs are visible.

### 4. Wallet Placeholder

1. Click wallet placeholder buttons if present.

Expected:

- Message explains wallet integration is not live yet.
- No real wallet integration occurs.

### 5. Share Referral

1. Copy referral link.
2. Use WhatsApp share link.

Expected:

- Referral link is unique to customer.
- No self-registration is required.

### 6. Invalid Card

1. Open invalid card URL.
2. Open disabled card if test data exists.

Expected:

- Clean "Card not available" message.
- No internal errors exposed.

## Issues To Watch

- Card too crowded on mobile.
- QR too small or too large.
- Referral section unclear.
- Wallet placeholders look like live integrations.
- Branding colors reduce readability.
