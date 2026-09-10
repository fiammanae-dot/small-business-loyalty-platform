# WhatsApp client onboarding (manual)

Connecting a business's own WhatsApp number to the platform, until Loyalty Card UAE
is business-verified and can use Embedded Signup as a Tech Provider.

The model: **the client's business is the verified one, not ours.** They invite us as an
admin on their Meta Business Portfolio, and we set their WhatsApp account up inside it.
Partner-level asset sharing is not available to us — Meta requires the partner business
to be verified and to hold Advanced access for `whatsapp_business_management`.

## Before you start

Ask the owner one question first: **is this number currently signed in to the WhatsApp
Business app?** If so it cannot be used by the Cloud API until it is removed from that
app, and they will lose the chat history on it. That conversation decides the timeline
more often than anything technical.

They will also need a **payment method on the WhatsApp Business Account** — marketing
template messages are billed per conversation and sends fail without billing set up.

## Steps

**The client does 1–3.**

1. Create a Meta Business Portfolio, or use their existing one.
2. Add your Facebook account as an **admin** under Users → People.
3. Add a payment method to the WhatsApp Business Account.

**You do the rest, inside their portfolio.**

4. Create their WhatsApp Business Account, add their phone number, verify by SMS or call.
5. Create the `new_loyalty_card` template and submit it for approval. Body is
   `Hi {{1}}, welcome to {{2}}!…` — **{{1}} customer, {{2}} business** — with a URL
   button whose base is `https://loyaltycarduae.com/card/{{1}}` and whose parameter is
   the bare card token. Wait for APPROVED.
6. Users → System users → add an Admin system user. **Assign assets first** (their app
   and their WhatsApp account, full control), *then* generate the token with
   `whatsapp_business_messaging` and `whatsapp_business_management`, expiry Never.
   A token generated before assets are assigned has no access to anything.
7. Put the token in a scratch file outside the repo, then:

```sh
node scripts/whatsapp/register-number.mjs \
  --phone-number-id <theirs> --waba-id <theirs> --token-file <path>
```

   Read-only. If `platform_type` is not `CLOUD_API`, register it — any 6 digits, and
   record them, this becomes the account's two-step verification PIN:

```sh
node scripts/whatsapp/register-number.mjs \
  --phone-number-id <theirs> --waba-id <theirs> --token-file <path> --register <PIN>
```

8. Connect the channel. Dry run first — it prints what it would write and stops:

```sh
node scripts/whatsapp/connect-channel.mjs \
  --business "<exact business name>" \
  --phone-number-id <theirs> --waba-id <theirs> \
  --token-file <path>
```

   Then add `--commit` to apply.

9. Delete the token file. It is stored encrypted in the database from this point.

## Verify

The business settings page should now show **Connected** with a test-send form. Send a
test to a number you control, then enroll one test customer with marketing consent and
a valid phone, and check:

```sh
node scripts/whatsapp/check-delivery.mjs --business "<exact business name>"
```

Expect status `SENT` with a `providerMessageId`, and
`duplicate WELCOME_CUSTOMER deliveries: none`. Delete the test customer afterwards.

## Known failures

| Symptom | Cause |
| --- | --- |
| `(#133010) Account not registered` | Number not registered for Cloud API — step 7 |
| `(#200)` on any management call | Token generated before assets were assigned — redo step 6 |
| Panel shows Connected but nothing sends | Template not APPROVED on *their* WABA; templates are per-WABA |
| Send skipped silently | No marketing consent, no phone, or `WHATSAPP_ENCRYPTION_KEY` unset — the send fails closed by design |

## Limits without business verification

250 unique customers per rolling 24 hours, 2 phone numbers per WABA, 250 templates,
and no display name — chats show the phone number rather than the business name. The
client can lift the display name by verifying their own business with Meta.
