import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("smoke test checklist covers every required critical flow before production deploys", () => {
  const checklist = read("docs/release/SMOKE_TEST_CHECKLIST.md");

  assert.match(checklist, /mandatory/i);
  for (const section of [
    "Public Website",
    "Authentication",
    "Business Owner Dashboard",
    "Customer 360",
    "Scanner",
    "Rewards",
    "Programs",
    "Google Wallet",
    "Platform Administrator",
  ]) {
    assert.match(checklist, new RegExp(section), `smoke test checklist must cover ${section}`);
  }
});

test("release checklist covers backup, migrations, validation, smoke test, deployment, verification, rollback, and versioning", () => {
  const release = read("docs/release/RELEASE_CHECKLIST.md");

  assert.match(release, /Database Backup/);
  assert.match(release, /Migration Verification/);
  assert.match(release, /npm test/);
  assert.match(release, /npm run lint/);
  assert.match(release, /npx tsc --noEmit/);
  assert.match(release, /npm run build/);
  assert.match(release, /Smoke Test/);
  assert.match(release, /## 5\. Deployment/);
  assert.match(release, /Post-Deployment Verification/);
  assert.match(release, /Rollback Steps/);
  assert.match(release, /Versioning & Git Tagging Strategy/);
  assert.match(release, /v1\.0\.0-beta\.1/);
  assert.match(release, /v1\.0\.0/);
  assert.match(release, /v1\.1\.0/);
});
