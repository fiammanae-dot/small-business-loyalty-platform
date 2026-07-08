import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Sentry is initialized for server, edge, and client runtimes, gated behind SENTRY_DSN", () => {
  const server = read("sentry.server.config.ts");
  const edge = read("sentry.edge.config.ts");
  const client = read("src/instrumentation-client.ts");

  for (const source of [server, edge]) {
    assert.match(source, /process\.env\.SENTRY_DSN/);
    assert.match(source, /if \(dsn\) \{/, "Sentry.init must be gated so a missing DSN never breaks the app");
    assert.match(source, /sendDefaultPii:\s*false/);
  }

  assert.match(client, /process\.env\.NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(client, /if \(dsn\) \{/);
  assert.match(client, /sendDefaultPii:\s*false/);
});

test("instrumentation.ts wires server/edge Sentry init and captures unhandled request errors", () => {
  const instrumentation = read("src/instrumentation.ts");

  assert.match(instrumentation, /validateEnvironment/, "env validation must still run alongside Sentry init");
  assert.match(instrumentation, /sentry\.server\.config/);
  assert.match(instrumentation, /sentry\.edge\.config/);
  assert.match(instrumentation, /onRequestError\s*=\s*Sentry\.captureRequestError/);
});

test("global-error.tsx reports uncaught React rendering errors to Sentry", () => {
  const globalError = read("src/app/global-error.tsx");

  assert.match(globalError, /"use client"/);
  assert.match(globalError, /Sentry\.captureException\(error\)/);
});

test("monitoring context attaches only non-PII identifiers (id, role, businessId)", () => {
  const monitoring = read("src/lib/monitoring.ts");

  assert.match(monitoring, /export function attachMonitoringContext/);
  assert.match(monitoring, /Sentry\.setUser\(\{ id: String\(user\.id\) \}\)/, "user object passed to Sentry must contain only the internal id, no email/name/phone");
  assert.match(monitoring, /Sentry\.setTag\("userRole"/);
  assert.match(monitoring, /Sentry\.setTag\("businessId"/);
});

test("session.ts attaches monitoring context without changing auth control flow", () => {
  const session = read("src/lib/session.ts");

  assert.match(session, /import \{ attachMonitoringContext \} from "@\/lib\/monitoring"/);
  assert.match(session, /attachMonitoringContext\(devFallbackUser\)/);
  assert.match(session, /attachMonitoringContext\(authUser\)/);
  assert.match(session, /attachMonitoringContext\(null\)/);
});

test("next.config wraps the app with withSentryConfig and disables source-map upload without an auth token", () => {
  const config = read("next.config.ts");

  assert.match(config, /import \{ withSentryConfig \} from "@sentry\/nextjs"/);
  assert.match(config, /export default withSentryConfig\(nextConfig/);
  assert.match(config, /disable:\s*!process\.env\.SENTRY_AUTH_TOKEN/);
});
