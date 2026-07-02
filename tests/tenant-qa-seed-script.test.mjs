import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const script = readFileSync("scripts/seed-tenant-isolation-qa.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("tenant QA seed command is registered", () => {
  assert.equal(packageJson.scripts["seed:tenant-qa"], "node scripts/seed-tenant-isolation-qa.js");
});

test("tenant QA seed requires explicit non-production safety guards", () => {
  assert.match(script, /NODE_ENV\s*===\s*"production"/);
  assert.match(script, /ALLOW_QA_RESET/);
  assert.match(script, /REQUIRED_RESET_FLAG\s*=\s*"true"/);
  assert.match(script, /Refusing to run tenant QA reset/);
});

test("tenant QA seed creates shared-phone tenant isolation cases", () => {
  assert.match(script, /\+971501111111/);
  assert.match(script, /Ahmed Ali/);
  assert.match(script, /Royal Barbers/);
  assert.match(script, /\+971502222222/);
  assert.match(script, /Glow Beauty Lounge/);
  assert.match(script, /BlueWave Car Wash/);
});
