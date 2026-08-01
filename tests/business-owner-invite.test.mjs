import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const businessActions = read("src/app/platform/businesses/actions.ts");
const welcomeSource = read("src/lib/business-welcome-email.ts");

const createBusinessBody = businessActions.slice(
  businessActions.indexOf("export async function createBusinessAction"),
  businessActions.indexOf("export async function updateBusinessAction"),
);

// CI runs `node --test` on Node 20, which cannot import .ts sources directly.
// Following the repo convention of testing the real source file, we read
// src/lib/business-welcome-email.ts, transpile it with the repo's existing
// TypeScript devDependency, and import the result as an in-memory ES module -
// so these behavioral tests exercise the actual implementation, not a copy.
// The `server-only` guard is the module's one runtime import and is stripped
// here because a bare specifier cannot resolve from a data: URL.
const runnableSource = welcomeSource.replace(/^import "server-only";$/m, "");
assert.doesNotMatch(
  runnableSource,
  /^import (?!type )/m,
  "src/lib/business-welcome-email.ts must stay free of runtime imports beyond server-only so its behavioral tests can run on CI's Node 20",
);
const transpiledWelcome = ts.transpileModule(runnableSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildBusinessWelcomeEmail, sendBusinessWelcomeEmail } = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledWelcome).toString("base64")}`
);

const sampleMessage = {
  to: "owner@sunrisecoffee.ae",
  businessName: "Sunrise Coffee",
  ownerName: "Layla Hassan",
  loginUrl: "https://loyaltycarduae.com/login",
};

test("a new business owner must replace the admin-set temporary password on first login", () => {
  const ownerCreate = createBusinessBody.slice(createBusinessBody.indexOf("await tx.user.create("));

  assert.match(ownerCreate, /role: "BUSINESS_OWNER"/);
  assert.match(ownerCreate, /forcePasswordChange: true/, "the admin-set password is temporary and must be changed at first sign-in");

  // The redirect that enforces it already exists; this flag is what triggers it.
  assert.match(read("src/lib/authz.ts"), /forcePasswordChange[\s\S]*?redirect\("\/change-password"\)/);
});

test("the welcome email is sent after the business commits and can never block or break creation", () => {
  assert.match(businessActions, /import \{ after \} from "next\/server"/);
  assert.match(businessActions, /import \{ sendBusinessWelcomeEmail \} from "@\/lib\/business-welcome-email"/);
  assert.match(businessActions, /import \{ getRequestBaseUrl \} from "@\/lib\/app-url"/);

  const transactionIndex = createBusinessBody.indexOf("await prisma.$transaction");
  const sendIndex = createBusinessBody.indexOf("sendBusinessWelcomeEmail(");
  const redirectIndex = createBusinessBody.indexOf("redirect(`/platform/businesses/");

  assert.ok(transactionIndex > -1 && sendIndex > -1, "createBusinessAction must both persist the business and send the welcome email");
  assert.ok(transactionIndex < sendIndex, "the email must be sent only after the transaction commits");
  assert.ok(sendIndex < redirectIndex, "the redirect still happens, after the email is scheduled");

  // Sending inside the transaction would roll the whole business back when the
  // email provider is down.
  const transactionBody = createBusinessBody.slice(transactionIndex, createBusinessBody.indexOf("return createdBusiness;"));
  assert.doesNotMatch(transactionBody, /sendBusinessWelcomeEmail/, "the email must never be sent inside the transaction");

  const emailBlock = createBusinessBody.slice(createBusinessBody.indexOf("after(async () => {"), redirectIndex);
  assert.match(emailBlock, /try \{/, "the send must be wrapped in try\\/catch");
  assert.match(emailBlock, /\} catch \(error\) \{/);
  assert.match(emailBlock, /console\.error\("Business welcome email failed", error\)/, "a failure is logged, never surfaced to the admin");
  assert.match(emailBlock, /loginUrl: `\$\{await getRequestBaseUrl\(\)\}\/login`/);
  assert.match(emailBlock, /to: data\.ownerEmail/);
  assert.match(emailBlock, /businessName: data\.name/);
  assert.match(emailBlock, /ownerName: data\.ownerName/);

  // Business creation still reports success exactly as before.
  assert.match(createBusinessBody, /revalidatePath\("\/platform\/businesses"\)/);
  assert.match(createBusinessBody, /redirect\(`\/platform\/businesses\/\$\{business\.uuid\}`\)/);
});

test("business creation survives an unconfigured email provider: the send is skipped, not thrown", async () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.PASSWORD_RESET_FROM_EMAIL;
  const realFetch = globalThis.fetch;
  const realConsoleInfo = console.info;

  let fetchCalls = 0;
  const skipLogs = [];
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("an unconfigured welcome email must never reach the network");
  };
  console.info = (message) => {
    skipLogs.push(String(message));
  };

  try {
    delete process.env.RESEND_API_KEY;
    process.env.PASSWORD_RESET_FROM_EMAIL = "Loyalty Card UAE <no-reply@loyaltycarduae.com>";
    assert.deepEqual(
      await sendBusinessWelcomeEmail(sampleMessage),
      { delivered: false, provider: "resend_not_configured" },
      "a missing API key is a silent skip, not a rejection",
    );

    process.env.RESEND_API_KEY = "test-api-key";
    delete process.env.PASSWORD_RESET_FROM_EMAIL;
    assert.deepEqual(
      await sendBusinessWelcomeEmail(sampleMessage),
      { delivered: false, provider: "sender_not_configured" },
      "a missing sender is a silent skip, not a rejection",
    );

    assert.equal(fetchCalls, 0, "nothing may be sent while the provider is unconfigured");
    assert.equal(skipLogs.length, 2, "each skip is recorded with console.info");
    for (const log of skipLogs) {
      assert.match(log, /^Business welcome email skipped: /);
    }
  } finally {
    globalThis.fetch = realFetch;
    console.info = realConsoleInfo;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousSender === undefined) delete process.env.PASSWORD_RESET_FROM_EMAIL;
    else process.env.PASSWORD_RESET_FROM_EMAIL = previousSender;
  }

  // Unlike the password reset email, this one has no production branch that
  // throws - a courtesy email must never fail a business creation.
  assert.doesNotMatch(welcomeSource, /NODE_ENV/, "the skip path must behave identically in production");
});

test("the welcome email explains how to sign in without ever carrying the temporary password", () => {
  const email = buildBusinessWelcomeEmail(sampleMessage);

  assert.equal(email.subject, "Welcome to Loyalty Card UAE");
  for (const body of [email.text, email.html]) {
    assert.match(body, /Sunrise Coffee/, "the owner is told which business the account belongs to");
    assert.match(body, /Layla Hassan/);
    assert.match(body, /https:\/\/loyaltycarduae\.com\/login/, "the login URL comes from the configured app URL");
    assert.match(body, /temporary password provided by your administrator/);
    assert.match(body, /new password on your first sign-in/);
  }

  // The temporary password is handed over by the administrator out of band and
  // must never be emailed.
  assert.doesNotMatch(welcomeSource, /temporaryPassword|passwordHash/, "the welcome email must not have access to the password at all");

  const injected = buildBusinessWelcomeEmail({
    businessName: "<b>Bakery</b>",
    ownerName: "<script>alert(1)</script>",
    loginUrl: "https://loyaltycarduae.com/login",
  });
  assert.doesNotMatch(injected.html, /<b>Bakery<\/b>|<script>/, "business and owner names are escaped, not injected as markup");
});
