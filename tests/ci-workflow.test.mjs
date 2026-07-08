import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("GitHub Actions CI runs install, test, lint, typecheck, and build on every PR", () => {
  const workflow = read(".github/workflows/ci.yml");

  assert.match(workflow, /on:\s*\n\s*pull_request:/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /tsc --noEmit/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npx prisma generate/);
});
