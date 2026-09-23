import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

function toDataUrl(source) {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}

async function importTs(path, subs = {}) {
  let source = read(path);
  for (const [from, to] of Object.entries(subs)) {
    assert.ok(source.includes(from), `${path} no longer contains ${from}`);
    source = source.replace(from, to);
  }
  return import(toDataUrl(source));
}

// client.ts pulls in server-only and google-auth-library; swap both for
// stand-ins so the real request code runs against a stubbed fetch.
const client = await importTs("src/lib/google-wallet/client.ts", {
  'import "server-only";': "",
  'import { JWT } from "google-auth-library";':
    'class JWT { async getRequestHeaders() { return new Headers({ Authorization: "Bearer test-token" }); } }',
});
const broadcast = await importTs("src/lib/google-wallet/broadcast.ts");
const policy = await importTs("src/lib/wallet-broadcast/policy.ts", {
  'from "@/lib/authz-policy"': `from "${toDataUrl(read("src/lib/authz-policy.ts"))}"`,
});

const CONFIG = { issuerId: "3388", serviceAccountEmail: "sa@example.iam", privateKey: "k", appUrl: "https://example.test" };
const MESSAGE = { id: "broadcast-1", header: "Double stamps", body: "This weekend only.", messageType: "TEXT_AND_NOTIFY" };

async function withFetch(responder, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return responder();
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

// ---------- client ----------

test("addMessage POSTs { message } to /loyaltyClass/{id}/addMessage", async () => {
  await withFetch(
    () => new Response(JSON.stringify({ resource: { id: "3388.shop_1" } }), { status: 200 }),
    async (calls) => {
      const api = client.createGoogleWalletApiClient(CONFIG);
      const result = await api.addMessage("loyaltyClass", "3388.shop_1", MESSAGE);

      assert.deepEqual(result, { resource: { id: "3388.shop_1" } });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/3388.shop_1/addMessage");
      assert.equal(calls[0].init.method, "POST");
      assert.equal(calls[0].init.headers.authorization ?? calls[0].init.headers.Authorization, "Bearer test-token");
      assert.deepEqual(JSON.parse(calls[0].init.body), { message: MESSAGE });
    },
  );
});

test("a non-2xx from addMessage surfaces as an error with Google's message", async () => {
  await withFetch(
    () => new Response(JSON.stringify({ error: { code: 429, message: "Too many messages" } }), { status: 429 }),
    async () => {
      const api = client.createGoogleWalletApiClient(CONFIG);
      await assert.rejects(api.addMessage("loyaltyClass", "3388.shop_1", MESSAGE), /429: Too many messages/);
    },
  );
});

// ---------- service (broadcast core) ----------

function deps(overrides = {}) {
  const sent = [];
  return {
    sent,
    getConfig: () => CONFIG,
    findClassId: async (programId) => `3388.program_${programId}`,
    createClient: () => ({
      addMessage: async (resource, id, message) => {
        sent.push({ resource, id, message });
        return {};
      },
    }),
    newMessageId: () => "broadcast-fixed",
    listActiveProgramIds: async () => [1, 2],
    ...overrides,
  };
}

test("program broadcast skips cleanly when Google Wallet is not configured", async () => {
  const d = deps({ getConfig: () => null });
  const result = await broadcast.runGoogleWalletProgramBroadcast(d, 1, { header: "H", body: "B" });
  assert.deepEqual(result, { ok: true, skipped: true, reason: "NOT_CONFIGURED" });
  assert.equal(d.sent.length, 0);
});

test("program broadcast skips cleanly when the program has no wallet class yet", async () => {
  const d = deps({ findClassId: async () => null });
  const result = await broadcast.runGoogleWalletProgramBroadcast(d, 1, { header: "H", body: "B" });
  assert.deepEqual(result, { ok: true, skipped: true, reason: "NO_EXISTING_CLASS" });
  assert.equal(d.sent.length, 0);
});

test("program broadcast adds exactly one notifying message to the program's class", async () => {
  const d = deps();
  const result = await broadcast.runGoogleWalletProgramBroadcast(d, 7, { header: "Double stamps", body: "Sat & Sun" });
  assert.deepEqual(result, { ok: true, skipped: false, classId: "3388.program_7" });
  assert.deepEqual(d.sent, [
    {
      resource: "loyaltyClass",
      id: "3388.program_7",
      message: { id: "broadcast-fixed", header: "Double stamps", body: "Sat & Sun", messageType: "TEXT_AND_NOTIFY" },
    },
  ]);
});

test("program broadcast turns a Google failure into { ok:false } instead of throwing", async () => {
  const d = deps({
    createClient: () => ({
      addMessage: async () => {
        throw new Error("403: Permission denied");
      },
    }),
  });
  const result = await broadcast.runGoogleWalletProgramBroadcast(d, 1, { header: "H", body: "B" });
  assert.deepEqual(result, { ok: false, reason: "SYNC_FAILED", error: "403: Permission denied" });
});

test("business broadcast totals reached / skipped / failed across active programs", async () => {
  const d = deps({
    listActiveProgramIds: async () => [1, 2, 3],
    findClassId: async (id) => (id === 2 ? null : `c${id}`),
    createClient: () => ({
      addMessage: async (_r, id) => {
        if (id === "c3") throw new Error("boom");
        return {};
      },
    }),
  });
  const result = await broadcast.runGoogleWalletBusinessBroadcast(d, 10, { header: "H", body: "B" });
  assert.equal(result.reached, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.errors, ["boom"]);
});

test("business broadcast is a clean no-op when Google Wallet is not configured", async () => {
  let listed = false;
  const d = deps({
    getConfig: () => null,
    listActiveProgramIds: async () => {
      listed = true;
      return [1];
    },
  });
  const result = await broadcast.runGoogleWalletBusinessBroadcast(d, 10, { header: "H", body: "B" });
  assert.equal(result.notConfigured, true);
  assert.equal(result.reached, 0);
  assert.equal(listed, false);
});

test("service wires the broadcast to the real config, class lookup and client", () => {
  const service = read("src/lib/google-wallet/service.ts");
  assert.match(service, /export function sendGoogleWalletProgramBroadcast/);
  assert.match(service, /export function sendGoogleWalletBroadcastForBusiness/);
  assert.match(service, /getConfig: getGoogleWalletConfig/);
  assert.match(service, /googleWalletClass\.findUnique\(\{\s*where: \{ loyaltyProgramId \}/);
  assert.match(service, /where: \{ businessId: id, active: true \}/);
  assert.match(service, /TODO: Apple Wallet broadcast \(post-enrollment\)/);
});

// ---------- action (policy) ----------

const OWNER = { id: 5, role: "BUSINESS_OWNER", businessId: 10, businessStatus: "ACTIVE", branchId: null };
const NOW = new Date("2026-09-23T10:00:00Z");

function actionDeps(overrides = {}) {
  const recorded = [];
  const sends = [];
  return {
    recorded,
    sends,
    getUser: async () => OWNER,
    findLastCountedBroadcastAt: async () => null,
    sendForBusiness: async (businessId, message) => {
      sends.push({ businessId, message });
      return { reached: 2, skipped: 0, failed: 0, notConfigured: false, errors: [], programs: [] };
    },
    recordBroadcast: async (record) => {
      recorded.push(record);
    },
    now: () => NOW,
    ...overrides,
  };
}

test("staff and branch managers cannot broadcast", async () => {
  for (const role of ["STAFF", "BRANCH_MANAGER"]) {
    const d = actionDeps({ getUser: async () => ({ ...OWNER, role }) });
    const outcome = await policy.runWalletBroadcast(d, { header: "H", body: "B" });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "FORBIDDEN");
    assert.equal(d.sends.length, 0);
    assert.equal(d.recorded.length, 0);
  }
});

test("an owner of an inactive business cannot broadcast", async () => {
  const d = actionDeps({ getUser: async () => ({ ...OWNER, businessStatus: "SUSPENDED" }) });
  const outcome = await policy.runWalletBroadcast(d, { header: "H", body: "B" });
  assert.equal(outcome.code, "FORBIDDEN");
});

test("empty or over-length header/body is rejected before sending", async () => {
  const cases = [
    { header: "", body: "B" },
    { header: "H", body: "   " },
    { header: "x".repeat(policy.WALLET_BROADCAST_HEADER_MAX + 1), body: "B" },
    { header: "H", body: "x".repeat(policy.WALLET_BROADCAST_BODY_MAX + 1) },
  ];
  for (const input of cases) {
    const d = actionDeps();
    const outcome = await policy.runWalletBroadcast(d, input);
    assert.equal(outcome.code, "INVALID", JSON.stringify(input).slice(0, 60));
    assert.equal(d.sends.length, 0);
  }
  assert.equal(policy.WALLET_BROADCAST_HEADER_MAX, 30);
  assert.equal(policy.WALLET_BROADCAST_BODY_MAX, 1000);
});

test("a broadcast within 12 hours of the last one is rejected", async () => {
  const lastSent = new Date(NOW.getTime() - 11 * 60 * 60 * 1000);
  const d = actionDeps({ findLastCountedBroadcastAt: async () => lastSent });
  const outcome = await policy.runWalletBroadcast(d, { header: "H", body: "B" });
  assert.equal(outcome.code, "COOLDOWN");
  assert.equal(outcome.availableAt.getTime(), lastSent.getTime() + 12 * 60 * 60 * 1000);
  assert.equal(d.sends.length, 0);
  assert.equal(d.recorded.length, 0);
});

test("after 12 hours the owner can send again", async () => {
  const d = actionDeps({ findLastCountedBroadcastAt: async () => new Date(NOW.getTime() - 12 * 60 * 60 * 1000) });
  const outcome = await policy.runWalletBroadcast(d, { header: "H", body: "B" });
  assert.equal(outcome.ok, true);
});

test("happy path sends once for the owner's business and writes a WalletBroadcast row", async () => {
  const d = actionDeps();
  const outcome = await policy.runWalletBroadcast(d, { header: "  Double stamps ", body: " This weekend " });
  assert.deepEqual(outcome, { ok: true, status: "SENT", reached: 2, skipped: 0, failed: 0 });
  assert.deepEqual(d.sends, [{ businessId: 10, message: { header: "Double stamps", body: "This weekend" } }]);
  assert.deepEqual(d.recorded, [
    {
      businessId: 10,
      channel: "GOOGLE_WALLET",
      header: "Double stamps",
      body: "This weekend",
      status: "SENT",
      programsReached: 2,
      programsSkipped: 0,
      programsFailed: 0,
      error: null,
      sentByUserId: 5,
    },
  ]);
});

test("a failed or empty send is still logged but does not start the cooldown", async () => {
  const failed = actionDeps({
    sendForBusiness: async () => ({ reached: 0, skipped: 0, failed: 1, notConfigured: false, errors: ["500: oops"], programs: [] }),
  });
  const outcome = await policy.runWalletBroadcast(failed, { header: "H", body: "B" });
  assert.equal(outcome.code, "FAILED");
  assert.equal(failed.recorded[0].status, "FAILED");
  assert.equal(failed.recorded[0].error, "500: oops");

  const empty = actionDeps({
    sendForBusiness: async () => ({ reached: 0, skipped: 0, failed: 0, notConfigured: true, errors: [], programs: [] }),
  });
  const emptyOutcome = await policy.runWalletBroadcast(empty, { header: "H", body: "B" });
  assert.equal(emptyOutcome.code, "NOTHING_TO_SEND");
  assert.equal(empty.recorded[0].status, "SKIPPED");

  assert.deepEqual([...policy.WALLET_BROADCAST_COOLDOWN_STATUSES], ["SENT", "PARTIAL"]);
});

test("server action is owner-only, CSRF-checked, demo-blocked and uses the tested policy", () => {
  const action = read("src/app/dashboard/wallet-broadcast/actions.ts");
  assert.match(action, /^"use server";/);
  assert.match(action, /validateCsrfForm\(formData, "dashboard:wallet-broadcast"\)/);
  assert.match(action, /requireBusinessScopedUserOrRedirect\(\{\s*roles: \["BUSINESS_OWNER"\]/);
  assert.match(action, /blockDemoModeExternalAction/);
  assert.match(action, /runWalletBroadcast\(/);
  assert.match(action, /prisma\.walletBroadcast\.create/);
  assert.match(action, /sendForBusiness: sendGoogleWalletBroadcastForBusiness/);

  const page = read("src/app/dashboard/wallet-broadcast/page.tsx");
  assert.match(page, /getBusinessOwnerContext/);
  assert.match(page, /CsrfInput scope="dashboard:wallet-broadcast"/);
});

test("schema and migration add WalletBroadcast with APPLE_WALLET reserved", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0051_wallet_broadcasts/migration.sql");
  assert.match(schema, /model WalletBroadcast \{/);
  assert.match(schema, /enum WalletBroadcastChannel \{\s*GOOGLE_WALLET[\s\S]*?APPLE_WALLET/);
  assert.match(migration, /CREATE TABLE "wallet_broadcasts"/);
  assert.match(migration, /'GOOGLE_WALLET', 'APPLE_WALLET'/);
  assert.doesNotMatch(migration, /DROP|ALTER TABLE "(?!wallet_broadcasts)/);
});
