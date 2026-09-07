import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const adapterSource = read("src/lib/whatsapp/cloud-api.ts");
const credentialsSource = read("src/lib/whatsapp/credentials.ts");

// CI runs `node --test` on Node 20, which cannot import .ts sources directly.
// Following the repo convention of testing the real source file, we transpile it
// with the repo's existing TypeScript devDependency and import the result as an
// in-memory ES module - so these tests exercise the actual adapter, not a copy.
// This works because the adapter has no runtime imports at all: the access token
// arrives already decrypted and `fetch` is injectable.
assert.doesNotMatch(
  adapterSource,
  /^import (?!type )/m,
  "src/lib/whatsapp/cloud-api.ts must stay free of runtime imports so it can be tested on CI's Node 20",
);

async function importTs(source) {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
}

const { buildMetaMessagesUrl, buildTemplateMessagePayload, createMetaCloudApiSender, summarizeMetaError } =
  await importTs(adapterSource);
const { encryptWhatsAppAccessToken, decryptWhatsAppAccessToken, parseWhatsAppEncryptionKey } =
  await importTs(credentialsSource);

const TOKEN = "EAAG-test-token-never-real";
const CREDENTIALS = { phoneNumberId: "1234567890", accessToken: TOKEN };

const MESSAGE = {
  recipientPhone: "971501234567",
  templateName: "welcome_loyalty_card",
  templateLanguage: "en",
  bodyVariables: ["Layla", "Emirates Coffee House"],
  urlButtonParameter: "cst_abc123",
};

/** A fetch double that records the single call it receives. */
function stubFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return responder();
  };
  return { calls, fetchImpl };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("a successful send posts the Cloud API template shape and returns the provider message id", async () => {
  const { calls, fetchImpl } = stubFetch(() =>
    jsonResponse(200, {
      messaging_product: "whatsapp",
      contacts: [{ input: "971501234567", wa_id: "971501234567" }],
      messages: [{ id: "wamid.HBgMOTcxNTAxMjM0NTY3" }],
    }),
  );

  const sender = createMetaCloudApiSender(CREDENTIALS, { fetchImpl });
  const result = await sender.sendTemplateMessage(MESSAGE);

  assert.deepEqual(result, { providerMessageId: "wamid.HBgMOTcxNTAxMjM0NTY3" });
  assert.equal(calls.length, 1);

  const [call] = calls;
  assert.equal(call.url, "https://graph.facebook.com/v21.0/1234567890/messages");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(call.init.headers["Content-Type"], "application/json");

  assert.deepEqual(JSON.parse(call.init.body), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "971501234567",
    type: "template",
    template: {
      name: "welcome_loyalty_card",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Layla" },
            { type: "text", text: "Emirates Coffee House" },
          ],
        },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "cst_abc123" }] },
      ],
    },
  });
});

test("the body variables keep the order the caller supplied", () => {
  // The approved Meta template pins {{1}} and {{2}}; the adapter must not reorder.
  const payload = buildTemplateMessagePayload({ ...MESSAGE, bodyVariables: ["first", "second", "third"] });
  const body = payload.template.components.find((component) => component.type === "body");

  assert.deepEqual(
    body.parameters.map((parameter) => parameter.text),
    ["first", "second", "third"],
  );
});

test("a template with no variables and no button sends no components at all", () => {
  const payload = buildTemplateMessagePayload({
    recipientPhone: "971501234567",
    templateName: "plain",
    templateLanguage: "en",
    bodyVariables: [],
  });

  assert.equal(payload.template.components, undefined);
});

test("the phone number id is path-encoded into the messages URL", () => {
  assert.equal(buildMetaMessagesUrl("111 222"), "https://graph.facebook.com/v21.0/111%20222/messages");
});

test("a 4xx returns a clean error instead of throwing, and never echoes the token", async () => {
  const { fetchImpl } = stubFetch(() =>
    jsonResponse(400, {
      error: {
        message: "(#132001) Template name does not exist in the translation",
        type: "OAuthException",
        code: 132001,
        error_data: { details: "template name (welcome_loyalty_card) does not exist in en" },
      },
    }),
  );

  const result = await createMetaCloudApiSender(CREDENTIALS, { fetchImpl }).sendTemplateMessage(MESSAGE);

  assert.ok("error" in result, "a 4xx must resolve to an error result, not reject");
  assert.match(result.error, /Template name does not exist/);
  assert.match(result.error, /code 132001/);
  assert.doesNotMatch(result.error, new RegExp(TOKEN), "the access token must never appear in an error");
});

test("a 5xx with an unreadable body still returns a usable error", async () => {
  const { fetchImpl } = stubFetch(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));

  const result = await createMetaCloudApiSender(CREDENTIALS, { fetchImpl }).sendTemplateMessage(MESSAGE);

  assert.deepEqual(result, { error: "WhatsApp API request failed with status 502." });
});

test("a thrown network failure returns an error rather than propagating", async () => {
  const fetchImpl = async () => {
    throw new TypeError("fetch failed");
  };

  const result = await createMetaCloudApiSender(CREDENTIALS, { fetchImpl }).sendTemplateMessage(MESSAGE);

  assert.deepEqual(result, { error: "fetch failed" });
});

test("a 2xx with no message id is treated as a failure, not a silent success", async () => {
  const { fetchImpl } = stubFetch(() => jsonResponse(200, { messaging_product: "whatsapp", messages: [] }));

  const result = await createMetaCloudApiSender(CREDENTIALS, { fetchImpl }).sendTemplateMessage(MESSAGE);

  assert.ok("error" in result);
  assert.match(result.error, /no message id/i);
});

test("error summaries degrade gracefully on unexpected bodies", () => {
  assert.equal(summarizeMetaError(500, null), "WhatsApp API request failed with status 500.");
  assert.equal(summarizeMetaError(400, { error: {} }), "WhatsApp API request failed with status 400.");
  assert.equal(summarizeMetaError(400, { error: { message: "Bad request" } }), "Bad request");
});

test("access tokens round-trip through AES-256-GCM and fail closed on tampering", () => {
  const key = parseWhatsAppEncryptionKey(Buffer.alloc(32, 7).toString("base64"));
  assert.ok(key, "a 32-byte base64 key must parse");

  const encrypted = encryptWhatsAppAccessToken(TOKEN, key);
  assert.match(encrypted, /^v1\./, "stored tokens carry a version prefix");
  assert.doesNotMatch(encrypted, new RegExp(TOKEN), "the raw token must never appear in the ciphertext");
  assert.equal(decryptWhatsAppAccessToken(encrypted, key), TOKEN);

  // Wrong key, tampered ciphertext, and malformed input all return null, never throw.
  assert.equal(decryptWhatsAppAccessToken(encrypted, Buffer.alloc(32, 8)), null);
  assert.equal(decryptWhatsAppAccessToken("not-a-payload", key), null);
  assert.equal(decryptWhatsAppAccessToken("v1.a.b.c", key), null);

  // Flip a byte of the ciphertext: the GCM auth tag must reject it.
  const [prefix, iv, authTag, ciphertext] = encrypted.split(".");
  const flipped = Buffer.from(ciphertext, "base64");
  flipped[0] ^= 0xff;
  assert.equal(decryptWhatsAppAccessToken([prefix, iv, authTag, flipped.toString("base64")].join("."), key), null);

  // And a flipped auth tag.
  const flippedTag = Buffer.from(authTag, "base64");
  flippedTag[0] ^= 0xff;
  assert.equal(decryptWhatsAppAccessToken([prefix, iv, flippedTag.toString("base64"), ciphertext].join("."), key), null);
});

test("a missing or wrong-length encryption key parses to null so callers fail closed", () => {
  assert.equal(parseWhatsAppEncryptionKey(undefined), null);
  assert.equal(parseWhatsAppEncryptionKey(""), null);
  assert.equal(parseWhatsAppEncryptionKey("too-short"), null);
});

test("no fake Meta credentials are committed and the body order matches the approved template", () => {
  // Phase 1 ships dormant: credentials come from the database row, never source.
  assert.doesNotMatch(adapterSource, /EAAG[A-Za-z0-9]{10,}/, "no access token may be committed");
  assert.doesNotMatch(adapterSource, /accessToken\s*=\s*"/, "the token is always passed in, never defaulted");

  const deliverySource = read("src/lib/whatsapp/welcome-card-delivery.ts");
  assert.doesNotMatch(deliverySource, /TODO: confirm variable order/);
  assert.match(
    deliverySource,
    /bodyVariables: \[customer\.firstName, context\.businessName\]/,
    "approved template `new_loyalty_card` is {{1}} customer name, {{2}} business name",
  );
});
