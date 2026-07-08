import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

// Support-session impersonation (getBusinessOwnerContext / getActiveSupportSessionForCurrentAdmin)
// is only ever consumed by read-rendering page.tsx files. Every write Server Action instead
// authorizes through requireRole()/requireBusinessOwner(), which checks the admin's own real,
// signed session role (PLATFORM_OWNER) rather than the impersonated business role. Since a
// Platform Owner's real role is never BUSINESS_OWNER/BRANCH_MANAGER/STAFF, this means no write
// path is reachable during a support session today, regardless of the session's readOnly flag.
// This test locks in that architectural guarantee: if a future change wires support-session
// impersonation into any of these write action files, it must explicitly honor `readOnly` at
// the same time, or this test will fail and flag the gap.
test("write server actions never accept support-session impersonation, so readOnly is enforced by construction", () => {
  const writeActionFiles = [
    "src/app/dashboard/actions.ts",
    "src/app/dashboard/programs/actions.ts",
    "src/app/dashboard/messages/actions.ts",
    "src/app/dashboard/notifications/actions.ts",
    "src/app/scan/actions.ts",
    "src/app/staff/customers/actions.ts",
    "src/app/staff/scanner/actions.ts",
    "src/app/branch/customers/actions.ts",
    "src/app/branch/programs/actions.ts",
    "src/app/branch/scanner/actions.ts",
  ];

  for (const file of writeActionFiles) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /getBusinessOwnerContext|getActiveSupportSessionForCurrentAdmin/,
      `${file} must not authorize writes through support-session impersonation without an explicit readOnly check`,
    );
  }
});

test("support session start/report UI surfaces readOnly as an informational field, not a client-only gate", () => {
  const actions = read("src/app/platform/businesses/support-actions.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(schema, /model SupportSession[\s\S]*readOnly\s+Boolean\s+@default\(true\)\s+@map\("read_only"\)/);
  assert.match(actions, /readOnly:\s*z\.boolean\(\)\.default\(true\)/, "readOnly must be parsed server-side, not trusted only from client UI state");
});
