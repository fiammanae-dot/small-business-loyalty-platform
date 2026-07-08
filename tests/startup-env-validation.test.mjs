import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("startup validation hard-requires DATABASE_URL, SESSION_SECRET, and a configured app URL in production", () => {
  const env = read("src/lib/env.ts");

  assert.match(env, /REQUIRED_ENV_KEYS = \["DATABASE_URL", "SESSION_SECRET"\]/);
  assert.match(env, /getConfiguredAppUrl/, "app URL check must reuse the canonical app-url.ts helper, not a duplicate check");
  assert.match(env, /if \(isProduction\(\)\) \{\s*throw new Error\(message\);/);
  assert.doesNotMatch(env, /NEXTAUTH_SECRET/, "NEXTAUTH_SECRET is unused by this codebase's custom session system and must not be required");
});

test("startup validation treats Google Wallet as optional and never blocks boot for it", () => {
  const env = read("src/lib/env.ts");

  assert.match(env, /isGoogleWalletConfigured/);
  assert.match(env, /console\.warn/);
  assert.doesNotMatch(
    env,
    /if \(!isGoogleWalletConfigured\(\)\)[\s\S]{0,40}throw/,
    "missing Google Wallet config must only warn, never throw",
  );
});

test("instrumentation.ts runs environment validation once at server startup", () => {
  const instrumentation = read("src/instrumentation.ts");

  assert.match(instrumentation, /export async function register/);
  assert.match(instrumentation, /NEXT_RUNTIME.*===.*"nodejs"/);
  assert.match(instrumentation, /validateEnvironment/);
});

test("no code references the unused NEXTAUTH_SECRET variable", () => {
  const env = read("src/lib/env.ts");
  const envExample = read(".env.example");

  assert.doesNotMatch(env, /NEXTAUTH_SECRET/);
  assert.doesNotMatch(envExample, /NEXTAUTH_SECRET/);
});
