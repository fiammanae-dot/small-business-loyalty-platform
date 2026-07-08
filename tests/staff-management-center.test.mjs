import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("business owner staff management uses the team management center structure", () => {
  const page = read("src/app/dashboard/staff/page.tsx");

  for (const expected of [
    "Team Management",
    "Manage your staff, branch managers, and account access.",
    "Add staff member",
    "Total staff",
    "Branch managers",
    "New this month",
    "Search by name, email, or role",
    "Team summary",
    "Staff list",
  ]) {
    assert.ok(page.includes(expected), `Missing staff management copy: ${expected}`);
  }

  for (const component of ["MetricCard", "StatusBadge", "ActionMenu", "SectionCard", "EmptyState", "ButtonLink"]) {
    assert.match(page, new RegExp(component), `Staff page should use ${component}`);
  }
});

test("business owner staff management preserves access actions without duplicated inline action columns", () => {
  const page = read("src/app/dashboard/staff/page.tsx");

  assert.match(page, /StaffPasswordResetAction/);
  assert.match(read("src/components/StaffPasswordResetAction.tsx"), /Reset Password/);
  assert.match(page, /Enable/);
  assert.match(page, /Disable/);
  assert.match(page, /toggleStaffStatusAction/);
  assert.match(page, /createStaffUserAction/);
  assert.match(page, /ActionMenu label="Actions"/);
  assert.doesNotMatch(page, /\["Name", "Email", "Role", "Branch", "Status", "Security", "Created", "Actions"\]/);
});

test("business owner staff pages avoid debug data and include responsive layouts", () => {
  const files = ["src/app/dashboard/staff/page.tsx", "src/app/dashboard/staff/[id]/page.tsx"];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /JSON\.stringify|debug payload|raw uuid/i, `${file} should not expose debug payloads`);
    assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, `${file} should not hardcode raw UUIDs`);
    assert.match(source, /lg:|md:|sm:/, `${file} should include responsive layout classes`);
  }
});
