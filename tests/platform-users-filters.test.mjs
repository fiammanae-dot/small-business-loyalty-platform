import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("platform users page exposes filters, sorting, badges, and mobile cards", () => {
  const page = read("src/app/platform/users/page.tsx");

  for (const expected of [
    "Search name",
    "Search email",
    "Role",
    "Business",
    "Branch",
    "Status",
    "Created from",
    "Created to",
    "Sort by",
    "Clear filters",
    "Showing {users.length} users",
    "All users",
    "System Administrators",
    "Business Owners",
    "Branch Managers",
    "Staff",
    "Demo/Test Data",
    "Test/Demo Data",
    "No users match these filters.",
    "UserMobileCard",
    "RoleBadge",
  ]) {
    assert.match(page, new RegExp(expected.replace(/[{}]/g, "\\$&")));
  }

  for (const expected of ["demo", "test", "phase", "debug", "\\\\d\\{10,\\}"]) {
    assert.match(page, new RegExp(expected, "i"));
  }

  assert.match(page, /name: \{ contains: name, mode: "insensitive" \}/);
  assert.match(page, /email: \{ contains: email, mode: "insensitive" \}/);
  assert.match(page, /businessId: selectedBusinessId/);
  assert.match(page, /branchId: selectedBranchId/);
  assert.match(page, /sort === "business"/);
  assert.match(page, /sort === "branch"/);
});
