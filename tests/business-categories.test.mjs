/**
 * A business category is only useful if every screen agrees it exists.
 *
 * The list used to be retyped in four places, so a new category could be
 * offered in a dropdown and then rejected when the form was saved - the kind
 * of bug that only shows up in front of a customer. These tests hold the list
 * in one place and check the clinic category is wired all the way through.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("there is one list of business categories, and every form validates against it", () => {
  const roles = read("src/lib/roles.ts");
  assert.match(roles, /export const businessTypeValues = \[/);

  // Every category in the list must have a label, and vice versa.
  const values = [...roles.matchAll(/^\s{2}"([A-Z_]+)",$/gm)].map((m) => m[1]);
  assert.ok(values.includes("AESTHETIC_CLINIC"), "clinic must be in the shared list");
  const labelBlock = roles.slice(roles.indexOf("businessTypeLabels"));
  for (const value of values) {
    assert.match(labelBlock, new RegExp(`${value}: "`), `${value} needs a label`);
  }

  // No form may carry its own copy of the list.
  for (const file of [
    "src/app/dashboard/actions.ts",
    "src/app/platform/businesses/actions.ts",
    "src/lib/programs.ts",
  ]) {
    const source = read(file);
    assert.match(source, /z\.enum\(businessTypeValues\)/, `${file} must validate against the shared list`);
    assert.doesNotMatch(
      source,
      /z\.enum\(\[\s*"COFFEE_SHOP"/,
      `${file} has its own copy of the category list - use businessTypeValues`,
    );
  }
});

test("a clinic gets a package template that does not give sessions away", () => {
  const programs = read("src/lib/programs.ts");
  const template = programs.slice(programs.indexOf("AESTHETIC_CLINIC: {"));
  const block = template.slice(0, template.indexOf("},"));

  assert.match(block, /requiredStamps: \d+/);
  // The decisive one: the customer already paid for these sessions, so free
  // starting stamps would be sessions the clinic hands over for nothing.
  assert.match(block, /startingBonusStamps: 0/, "a paid package must start empty");
  assert.match(block, /productOrServiceName: "Session"/);
});

test("a clinic gets its own card look", () => {
  const design = read("src/lib/card-design.ts");
  assert.match(design, /businessTypes: \["AESTHETIC_CLINIC"\]/);
  assert.match(design, /templateId: "industry-aesthetic-clinic-v1"/);

  // Recommended icons must be icons that actually exist, or the card draws nothing.
  const clinicIcons = design.match(/export const clinicStampIcons = \[([^\]]+)\]/);
  assert.ok(clinicIcons, "clinic icon list must exist");
  const allIcons = design.slice(design.indexOf("export const generalStampIcons"), design.indexOf("export type CardDesignStampIcon"));
  for (const icon of clinicIcons[1].match(/"[A-Z_]+"/g) ?? []) {
    assert.ok(allIcons.includes(icon), `${icon} is recommended for clinics but is not a real icon`);
  }
});

test("every per-industry table covers the new category", () => {
  // These tables are spread over several files. The type checker catches a
  // missing one, but only after the fact - this names the files so the next
  // category added does not have to be found the same way.
  for (const file of ["src/lib/card-design.ts", "src/lib/card-asset-catalog.ts"]) {
    const source = read(file);
    for (const [, table] of source.matchAll(/Record<IndustryDesignPackId, [^>]+> = \{/g)) {
      void table;
    }
    const tables = [...source.matchAll(/Record<IndustryDesignPackId, [^>]+> = \{([\s\S]*?)\n\};/g)];
    assert.ok(tables.length > 0, `${file} should hold at least one per-industry table`);
    for (const [, body] of tables) {
      assert.match(body, /AESTHETIC_CLINIC:/, `a per-industry table in ${file} is missing the clinic`);
      assert.match(body, /GENERAL:/, `a per-industry table in ${file} is missing the fallback`);
    }
  }
});

test("the clinic category is carried by a migration, not only by the schema", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /enum BusinessType \{[\s\S]*?AESTHETIC_CLINIC[\s\S]*?\}/);

  // Without a migration the column would reject the value in production even
  // though every screen offers it.
  const migrations = readdirSync("prisma/migrations");
  const folder = migrations.find((name) => name.includes("aesthetic_clinic"));
  assert.ok(folder, "the new category needs its own migration");
  const sql = read(`prisma/migrations/${folder}/migration.sql`);
  assert.match(sql, /ALTER TYPE "BusinessType" ADD VALUE/);
  // Adding a value is additive; anything else here would rewrite existing rows.
  assert.doesNotMatch(sql, /DROP|DELETE|UPDATE /i, "this migration must only add a value");
});

test("the demo clinic script cannot be pointed at the live database", () => {
  const seed = read("scripts/db/seed-demo-clinic.mjs");

  // The whole value of a demo account is that it leaves no trace in the real
  // numbers. One mistyped variable would put fake clinics next to real clients.
  assert.match(seed, /PRODUCTION_DATABASE_URL/);
  assert.match(seed, /Refusing to run/);
  // Neon's pooled and direct endpoints are the same database under two names,
  // so the guard has to compare them with "-pooler" stripped or it lets one through.
  assert.match(seed, /replace\("-pooler\.", "\."\)/);

  // Dry run unless explicitly told otherwise, like the production migration script.
  assert.match(seed, /const WRITE = process\.argv\.includes\("--yes"\)/);
  assert.match(seed, /if \(!WRITE\) throw Object\.assign\(new DryRunRollback/);
});

test("the demo clinic is a believable clinic, not an empty shell", () => {
  const seed = read("scripts/db/seed-demo-clinic.mjs");

  // A prospect clicks around. Empty screens sell nothing, so the demo needs
  // customers at the start, at the halfway reward, and at the finish.
  assert.match(seed, /businessType: "AESTHETIC_CLINIC"/);
  assert.match(seed, /completesCard: false/, "there must be a reward before the package ends");
  assert.match(seed, /completesCard: true/);
  assert.match(seed, /startingBonusStamps: 0/, "a paid package must not start with free sessions");

  const stages = [...seed.matchAll(/progress: ([A-Z_]+|\d+)/g)].map((m) => m[1]);
  assert.ok(stages.length >= 5, "the demo needs customers at several stages");
  assert.ok(stages.includes("MILESTONE_AT"), "someone must be sitting on the halfway reward");
  assert.ok(stages.includes("REQUIRED_SESSIONS"), "someone must have finished the package");

  // Nothing in the demo should name a treatment or a body area - that is the
  // line between a visit counter and a medical record.
  assert.doesNotMatch(seed, /bikini|underarm|body area/i);
});
