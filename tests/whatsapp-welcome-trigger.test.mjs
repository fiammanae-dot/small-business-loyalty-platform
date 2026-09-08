import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const deliverySource = read("src/lib/whatsapp/welcome-card-delivery.ts");
const wiringSource = read("src/lib/whatsapp/send-welcome-card.ts");

// Same convention as the other behavioural suites: transpile the real source and
// import it. The delivery rules are kept free of runtime imports (every side
// effect is injected) precisely so they can be exercised here without a database.
assert.doesNotMatch(
  deliverySource,
  /^import (?!type )/m,
  "src/lib/whatsapp/welcome-card-delivery.ts must stay free of runtime imports so it can be tested on CI's Node 20",
);
const transpiled = ts.transpileModule(deliverySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { deliverWelcomeCard } = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

const BUSINESS_ID = 7;
const MEMBERSHIP_ID = 42;
const INPUT = { businessId: BUSINESS_ID, membershipId: MEMBERSHIP_ID };

const CONNECTED_CHANNEL = {
  provider: "META_CLOUD_API",
  phoneNumberId: "1234567890",
  accessTokenEncrypted: "v1.aa.bb.cc",
  connectionStatus: "CONNECTED",
  welcomeTemplateName: "welcome_loyalty_card",
  welcomeTemplateLanguage: "en",
  welcomeTemplateStatus: "APPROVED",
};

const CONSENTING_CUSTOMER = {
  id: MEMBERSHIP_ID,
  firstName: "Layla",
  phone: "+971501234567",
  cardToken: "cst_abc123",
  marketingConsent: true,
};

/**
 * A recording test double for every injected side effect. `overrides` swaps in
 * the one behaviour a given test is about.
 */
function createHarness(overrides = {}) {
  const state = {
    sent: [],
    created: [],
    markedSent: [],
    markedFailed: [],
    errorsLogged: [],
    existingDelivery: false,
    nextDeliveryId: 100,
  };

  const sendResult = overrides.sendResult ?? { providerMessageId: "wamid.TEST" };

  const deps = {
    loadContext: async () => ({
      businessName: "Emirates Coffee House",
      channel: overrides.channel === undefined ? CONNECTED_CHANNEL : overrides.channel,
      customer: overrides.customer === undefined ? CONSENTING_CUSTOMER : overrides.customer,
      ...(overrides.context ?? {}),
    }),
    hasExistingDelivery: async () => state.existingDelivery,
    createDelivery: async (input) => {
      state.created.push(input);
      return { id: state.nextDeliveryId };
    },
    markDeliverySent: async (input) => {
      state.markedSent.push(input);
    },
    markDeliveryFailed: async (input) => {
      state.markedFailed.push(input);
    },
    buildCardUrl: async (cardToken) => `https://loyaltycarduae.com/card/${cardToken}`,
    formatRecipient: (phone) => (phone === "+971501234567" ? "971501234567" : null),
    maskRecipient: () => "05* *** 4567",
    renderMessageBody: ({ businessName, customerName, cardUrl }) => `Hello ${customerName}, welcome to ${businessName}. ${cardUrl}`,
    createSender: async () =>
      overrides.senderError
        ? { error: overrides.senderError }
        : {
            sendTemplateMessage: async (message) => {
              state.sent.push(message);
              return sendResult;
            },
          },
    logError: (event, detail) => state.errorsLogged.push({ event, detail }),
    ...(overrides.deps ?? {}),
  };

  return { deps, state };
}

test("a consenting customer at a connected business with an approved template is sent their card", async () => {
  const { deps, state } = createHarness();

  const outcome = await deliverWelcomeCard(deps, INPUT);

  assert.deepEqual(outcome, { status: "sent", deliveryId: 100, providerMessageId: "wamid.TEST" });

  // One delivery row, recorded before the send.
  assert.equal(state.created.length, 1);
  assert.deepEqual(state.created[0], {
    businessId: BUSINESS_ID,
    membershipId: MEMBERSHIP_ID,
    recipientMasked: "05* *** 4567",
    messageBody: "Hello Layla, welcome to Emirates Coffee House. https://loyaltycarduae.com/card/cst_abc123",
  });

  // Sent through the template the business had approved, to the formatted MSISDN.
  assert.equal(state.sent.length, 1);
  assert.deepEqual(state.sent[0], {
    recipientPhone: "971501234567",
    templateName: "welcome_loyalty_card",
    templateLanguage: "en",
    bodyVariables: ["Layla", "Emirates Coffee House"],
    urlButtonParameter: "cst_abc123",
  });

  // Row closed out as SENT with the provider's id, and never as FAILED.
  assert.deepEqual(state.markedSent, [{ businessId: BUSINESS_ID, deliveryId: 100, providerMessageId: "wamid.TEST" }]);
  assert.deepEqual(state.markedFailed, []);
});

test("the masked recipient is stored, never the full number", async () => {
  const { deps, state } = createHarness();
  await deliverWelcomeCard(deps, INPUT);

  assert.doesNotMatch(state.created[0].recipientMasked, /971501234567/);
});

const skipCases = [
  {
    name: "the customer has not given marketing consent",
    overrides: { customer: { ...CONSENTING_CUSTOMER, marketingConsent: false } },
    reason: "NO_CONSENT",
  },
  {
    name: "the business has not connected WhatsApp",
    overrides: { channel: { ...CONNECTED_CHANNEL, connectionStatus: "NOT_CONNECTED" } },
    reason: "NOT_CONNECTED",
  },
  {
    name: "the connection is in an error state",
    overrides: { channel: { ...CONNECTED_CHANNEL, connectionStatus: "ERROR" } },
    reason: "NOT_CONNECTED",
  },
  {
    name: "the business has no channel row at all",
    overrides: { channel: null },
    reason: "NO_CHANNEL",
  },
  {
    name: "Meta has not approved the welcome template",
    overrides: { channel: { ...CONNECTED_CHANNEL, welcomeTemplateStatus: "PENDING" } },
    reason: "TEMPLATE_NOT_APPROVED",
  },
  {
    name: "Meta rejected the welcome template",
    overrides: { channel: { ...CONNECTED_CHANNEL, welcomeTemplateStatus: "REJECTED" } },
    reason: "TEMPLATE_NOT_APPROVED",
  },
  {
    name: "the customer has no phone on file",
    overrides: { customer: { ...CONSENTING_CUSTOMER, phone: null } },
    reason: "NO_PHONE",
  },
  {
    name: "the customer's phone is not a usable UAE mobile",
    overrides: { customer: { ...CONSENTING_CUSTOMER, phone: "+1 555 0100" } },
    reason: "NO_PHONE",
  },
  {
    name: "the membership no longer exists",
    overrides: { customer: null },
    reason: "NO_CUSTOMER",
  },
];

for (const { name, overrides, reason } of skipCases) {
  test(`skips silently when ${name}`, async () => {
    const { deps, state } = createHarness(overrides);

    const outcome = await deliverWelcomeCard(deps, INPUT);

    assert.deepEqual(outcome, { status: "skipped", reason });
    assert.deepEqual(state.created, [], "a skip must not write a delivery row");
    assert.deepEqual(state.sent, [], "a skip must not call the provider");
  });
}

test("a second enrollment does not send a second welcome card", async () => {
  const { deps, state } = createHarness();

  const first = await deliverWelcomeCard(deps, INPUT);
  assert.equal(first.status, "sent");

  // What the real guard sees on the next enrollment: a welcome row already exists.
  state.existingDelivery = true;

  const second = await deliverWelcomeCard(deps, INPUT);

  assert.deepEqual(second, { status: "skipped", reason: "ALREADY_DELIVERED" });
  assert.equal(state.created.length, 1, "no second delivery row");
  assert.equal(state.sent.length, 1, "no second provider call");
});

test("a provider failure marks the row FAILED and reports the error", async () => {
  const { deps, state } = createHarness({ sendResult: { error: "(#131047) Re-engagement message" } });

  const outcome = await deliverWelcomeCard(deps, INPUT);

  assert.deepEqual(outcome, { status: "failed", deliveryId: 100, error: "(#131047) Re-engagement message" });
  assert.deepEqual(state.markedFailed, [
    { businessId: BUSINESS_ID, deliveryId: 100, error: "(#131047) Re-engagement message" },
  ]);
  assert.deepEqual(state.markedSent, [], "a failed send must never be recorded as SENT");
  assert.equal(state.errorsLogged.length, 1, "the failure is logged");
});

test("an undecryptable token fails the row without ever calling the provider", async () => {
  const { deps, state } = createHarness({ senderError: "Stored WhatsApp access token could not be decrypted." });

  const outcome = await deliverWelcomeCard(deps, INPUT);

  assert.equal(outcome.status, "failed");
  assert.equal(state.sent.length, 0);
  assert.equal(state.markedFailed.length, 1);
});

test("the delivery row is written before the send, so a crash leaves a trace", async () => {
  const order = [];
  const { deps } = createHarness({
    deps: {
      createDelivery: async () => {
        order.push("create");
        return { id: 100 };
      },
      createSender: async () => ({
        sendTemplateMessage: async () => {
          order.push("send");
          return { providerMessageId: "wamid.TEST" };
        },
      }),
    },
  });

  await deliverWelcomeCard(deps, INPUT);

  assert.deepEqual(order, ["create", "send"]);
});

test("enrollment is never blocked or failed by the welcome card", () => {
  // Scheduled after the response, and every error swallowed at both levels.
  assert.match(wiringSource, /import \{ after \} from "next\/server"/);
  assert.match(wiringSource, /export function scheduleWelcomeCardMessage/);
  assert.match(wiringSource, /try \{\s*after\(async \(\) => \{[\s\S]*?\}\);\s*\} catch/);
  assert.match(wiringSource, /export async function sendWelcomeCardMessage[\s\S]*?try \{[\s\S]*?\} catch \(error\)/);

  // Every enrollment path that raises WELCOME_CUSTOMER schedules the card, and
  // they all go through the one shared helper so the behaviour cannot drift.
  const enrollmentPaths = [
    "src/lib/customers.ts",
    "src/app/branch/programs/actions.ts",
    "src/app/dashboard/programs/actions.ts",
    "src/app/join/program/[token]/actions.ts",
  ];

  for (const path of enrollmentPaths) {
    const source = read(path);
    assert.match(source, /import \{ scheduleWelcomeCardMessage \} from "@\/lib\/whatsapp\/send-welcome-card"/, path);
    assert.match(source, /scheduleWelcomeCardMessage\(\{ businessId/, path);
  }

  // The join flow enrolls in two places; only a first-time program enrollment
  // raises WELCOME_CUSTOMER, and only that case may schedule a card.
  const joinSource = read("src/app/join/program/[token]/actions.ts");
  assert.match(joinSource, /welcomeMembershipId = existingMembership\.id/);
  assert.match(joinSource, /if \(result\.welcomeMembershipId !== null\)/);
});

test("the wiring reuses the existing card URL, phone, consent, and message helpers", () => {
  assert.match(wiringSource, /import \{ getCardUrl, maskPhoneNumber \} from "@\/lib\/customer-cards"/);
  assert.match(wiringSource, /import \{ formatUaePhoneForWhatsApp \} from "@\/lib\/phone"/);
  assert.match(wiringSource, /import \{ buildWelcomeCardWhatsAppMessage \} from "@\/lib\/whatsapp-messages"/);
  assert.match(wiringSource, /buildCardUrl: \(cardToken\) => getCardUrl\(cardToken\)/);
  assert.match(wiringSource, /formatRecipient: \(phone\) => formatUaePhoneForWhatsApp\(phone\)/);

  // Consent comes off the membership, the same flag createEngagementEventIfAllowed uses.
  assert.match(wiringSource, /marketingConsent: true/);
  assert.match(deliverySource, /if \(!customer\.marketingConsent\) return skip\("NO_CONSENT"\)/);

  // The card URL is never reconstructed by hand.
  assert.doesNotMatch(wiringSource, /\/card\/\$\{/, "the card URL must come from getCardUrl");
});

test("every delivery query is scoped to the tenant", () => {
  // Membership, channel, and both queue updates carry businessId.
  assert.match(wiringSource, /where: \{ id: membershipId, businessId, status: "ACTIVE" \}/);
  assert.match(wiringSource, /where: \{ id: businessId, status: "ACTIVE", deletedAt: null \}/);

  const updates = wiringSource.match(/messageDeliveryQueue\.updateMany\(\{\s*where: \{ id: deliveryId, businessId \}/g) ?? [];
  assert.equal(updates.length, 2, "both the SENT and FAILED updates are tenant-scoped");

  // The token is read from the row that was already loaded under this business,
  // never looked up separately by phone number id.
  assert.doesNotMatch(wiringSource, /findFirst\(\{\s*where: \{ phoneNumberId/);
  assert.match(wiringSource, /decryptWhatsAppAccessToken\(channel\.accessTokenEncrypted, key\)/);
});

test("the manual wa.me path and its builders are left intact", () => {
  const builders = read("src/lib/whatsapp-messages.ts");

  assert.match(builders, /export function buildWelcomeCardWhatsAppMessage/);
  assert.match(builders, /export function buildResendCardWhatsAppMessage/);
  assert.match(builders, /export function buildUpdatedCardWhatsAppMessage/);
  assert.match(builders, /export function buildRewardReadyWhatsAppMessage/);
  assert.match(builders, /export function getWhatsAppManualLink/);

  // SENT is a new status beside SENT_MANUALLY, not a replacement for it.
  const messages = read("src/lib/messages.ts");
  assert.match(messages, /SENT_MANUALLY: "Sent Manually"/);
  assert.match(messages, /SENT: "Sent Automatically"/);
});

test("the channel ships dormant until real credentials are inserted", () => {
  const schema = read("prisma/schema.prisma");

  assert.match(schema, /connectionStatus\s+WhatsAppConnectionStatus\s+@default\(NOT_CONNECTED\)/);
  assert.match(schema, /welcomeTemplateStatus\s+WhatsAppTemplateStatus\s+@default\(PENDING\)/);
  assert.match(schema, /accessTokenEncrypted String\s+@map\("access_token_encrypted"\)/);
  assert.match(schema, /businessId Int\s+@unique @map\("business_id"\)/, "one channel per business");
  assert.match(schema, /business Business @relation\(fields: \[businessId\], references: \[id\], onDelete: Cascade\)/);

  // The enum has room for a BSP without a schema change at the call sites.
  assert.match(schema, /enum WhatsAppProvider \{\s*\n\s*META_CLOUD_API/);
  assert.match(schema, /THREE_SIXTY_DIALOG/);

  // No credentials in the example env, only the key placeholder.
  assert.match(read(".env.example"), /^WHATSAPP_ENCRYPTION_KEY=""$/m);
});
