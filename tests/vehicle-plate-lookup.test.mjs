import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const vehiclesSource = read("src/lib/vehicles.ts");

// Same convention as tests/whatsapp-cloud-api.test.mjs: CI runs `node --test`
// on a Node that cannot import .ts directly, so transpile the real source and
// import it in memory. This only works because vehicles.ts has no runtime
// imports - which is also what keeps the plate rules testable in isolation.
assert.doesNotMatch(
  vehiclesSource,
  /^import (?!type )/m,
  "src/lib/vehicles.ts must stay free of runtime imports so it can be tested on CI",
);

async function importTs(source) {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
}

const vehicles = await importTs(vehiclesSource);

test("plate codes are validated by emirate, not by one global rule", () => {
  const { checkVehicleCode } = vehicles;

  // Dubai issues letters, including the double letters AA-DD.
  assert.equal(checkVehicleCode("DUBAI", "A"), null);
  assert.equal(checkVehicleCode("DUBAI", "aa"), null);
  assert.match(checkVehicleCode("DUBAI", "5"), /letters/);

  // Abu Dhabi and Sharjah issue numeric category codes.
  assert.equal(checkVehicleCode("ABU_DHABI", "13"), null);
  assert.equal(checkVehicleCode("ABU_DHABI", "50"), null);
  assert.match(checkVehicleCode("ABU_DHABI", "A"), /numbers/);
  assert.equal(checkVehicleCode("SHARJAH", "3"), null);
  assert.match(checkVehicleCode("SHARJAH", "B"), /numbers/);

  // The northern emirates issue a single letter - never a double.
  assert.equal(checkVehicleCode("AJMAN", "B"), null);
  assert.equal(checkVehicleCode("RAS_AL_KHAIMAH", "K"), null);
  assert.equal(checkVehicleCode("FUJAIRAH", "P"), null);
  assert.equal(checkVehicleCode("UMM_AL_QUWAIN", "C"), null);
  assert.match(checkVehicleCode("AJMAN", "AA"), /single letter/);

  // An absent code is fine: some plates carry none, and refusing to enroll a
  // car that is sitting in front of the washer is worse than a loose record.
  assert.equal(checkVehicleCode("DUBAI", ""), null);
  assert.equal(checkVehicleCode("DUBAI", null), null);
});

test("validation checks plate shape, never a whitelist of issued codes", () => {
  // Published sources disagree on which letters each northern emirate issues,
  // and emirates add codes over time. A whitelist would reject real plates.
  const { checkVehicleCode } = vehicles;
  for (const letter of ["Q", "X", "Z"]) {
    assert.equal(checkVehicleCode("FUJAIRAH", letter), null, `${letter} must be accepted`);
  }
  assert.equal(checkVehicleCode("ABU_DHABI", "49"), null);
});

test("the stored key is canonical across the ways people write a plate", () => {
  const { normalizePlate } = vehicles;
  const canonical = "DUBAI-A-12345";

  assert.equal(normalizePlate({ emirate: "DUBAI", code: "a", number: "12345" }), canonical);
  assert.equal(normalizePlate({ emirate: "DUBAI", code: " A ", number: "012345" }), canonical);
  assert.equal(normalizePlate({ emirate: "DUBAI", code: "A", number: "12345" }), canonical);

  // Without an emirate or a number there is nothing safe to index on.
  assert.equal(normalizePlate({ emirate: "", code: "A", number: "12345" }), null);
  assert.equal(normalizePlate({ emirate: "DUBAI", code: "A", number: "" }), null);
  assert.equal(normalizePlate({ emirate: "DUBAI", code: "A", number: "123456" }), null);

  // A plate with no code still gets a stable key.
  assert.equal(normalizePlate({ emirate: "SHARJAH", code: null, number: "707" }), "SHARJAH---707");
});

test("search parses whole plates, including multi-word emirate names", () => {
  const { parsePlateQuery } = vehicles;

  // The regression this test exists for: "abu dhabi" is two words, and an
  // earlier parser swallowed the code token along with the emirate name.
  assert.deepEqual(parsePlateQuery("abu dhabi 13 4567"), {
    normalizedPlate: "ABU_DHABI-13-4567",
    numberOnly: "4567",
    emirate: "ABU_DHABI",
    code: "13",
  });
  assert.equal(parsePlateQuery("ras al khaimah k 900").normalizedPlate, "RAS_AL_KHAIMAH-K-900");
  assert.equal(parsePlateQuery("umm al quwain c 45").normalizedPlate, "UMM_AL_QUWAIN-C-45");

  // Separator styles all collapse to the same key.
  for (const query of ["dxb a 12345", "DXB-A-12345", "DXBA12345", "dubai a 12345"]) {
    assert.equal(parsePlateQuery(query).normalizedPlate, "DUBAI-A-12345", query);
  }

  assert.equal(parsePlateQuery("auh 50 1").normalizedPlate, "ABU_DHABI-50-1");
  assert.equal(parsePlateQuery("sharjah 3 707").normalizedPlate, "SHARJAH-3-707");
});

test("search still works when staff can only read the digits", () => {
  const { parsePlateQuery } = vehicles;

  // A washer reading a dirty plate is often only sure of the number, so the
  // bare digits must remain matchable on their own.
  assert.deepEqual(parsePlateQuery("12345"), {
    normalizedPlate: null,
    numberOnly: "12345",
    emirate: null,
    code: null,
  });
  assert.equal(parsePlateQuery("A 12345").numberOnly, "12345");
  assert.equal(parsePlateQuery("A 12345").emirate, null);

  // Nothing usable must not produce a match-anything query.
  assert.deepEqual(parsePlateQuery("   "), { normalizedPlate: null, numberOnly: null, emirate: null, code: null });
  assert.equal(parsePlateQuery("ahmed").numberOnly, null);
  assert.equal(parsePlateQuery("ahmed").normalizedPlate, null);
});

test("plates render the way people say them", () => {
  const { formatPlateDisplay } = vehicles;
  assert.equal(formatPlateDisplay({ emirate: "DUBAI", code: "a", number: "012345" }), "Dubai A 12345");
  assert.equal(formatPlateDisplay({ emirate: "SHARJAH", code: null, number: "707" }), "Sharjah 707");
  assert.equal(formatPlateDisplay({ emirate: "ABU_DHABI", code: "13", number: "4567" }), "Abu Dhabi 13 4567");
  assert.equal(formatPlateDisplay({ emirate: null, code: "A", number: "12345" }), null);
});

test("brand and colour are pick-lists, model stays free text", () => {
  const { VEHICLE_BRANDS, VEHICLE_COLOURS, VEHICLE_SIZES, isVehicleBrand, isVehicleColour, isVehicleSize, normalizeVehicleModel } =
    vehicles;

  // The brands a Sharjah forecourt actually sees, including the Chinese brands
  // that arrived recently - a list that cannot name the car is worse than none.
  for (const brand of ["Toyota", "Nissan", "Mitsubishi", "Land Rover", "Mercedes-Benz", "BYD", "Jetour", "MG", "Other"]) {
    assert.ok(VEHICLE_BRANDS.includes(brand), `${brand} must be offered`);
  }
  assert.ok(isVehicleBrand("Toyota"));
  assert.equal(isVehicleBrand("Not A Brand"), false);
  assert.equal(VEHICLE_BRANDS.at(-1), "Other", "Other must be last so it never displaces a real brand");

  assert.ok(isVehicleColour("WHITE"));
  assert.equal(isVehicleColour("TURQUOISE"), false);
  assert.equal(VEHICLE_COLOURS[0], "WHITE", "white is the most common car colour in the UAE");

  assert.ok(isVehicleSize("LARGE_SUV"));
  assert.equal(isVehicleSize("LORRY"), false);
  assert.deepEqual([...VEHICLE_SIZES].slice(0, 2), ["SMALL_CAR", "SEDAN"], "sizes run smallest first");

  // Model is typed, so it needs a ceiling and consistent whitespace.
  assert.equal(normalizeVehicleModel("  Land   Cruiser "), "Land Cruiser");
  assert.equal(normalizeVehicleModel(""), null);
  assert.equal(normalizeVehicleModel(null), null);
  assert.equal(normalizeVehicleModel("x".repeat(80)).length, 40);
});

test("a car reads the way staff would say it out loud", () => {
  const { formatVehicleDescription } = vehicles;

  assert.equal(
    formatVehicleDescription({ colour: "WHITE", brand: "Nissan", model: "Patrol" }),
    "White Nissan Patrol",
  );
  assert.equal(formatVehicleDescription({ colour: "BLACK", brand: null, model: null }), "Black");
  assert.equal(formatVehicleDescription({ colour: null, brand: null, model: null }), null);

  // "Other" is a data value, not something to show a human.
  assert.equal(formatVehicleDescription({ colour: "OTHER", brand: "Other", model: "Patrol" }), "Patrol");
});

test("unknown dropdown values are dropped, never allowed to block an enrollment", () => {
  // A cached page could submit an option that has since been removed. These
  // fields are all optional, so the right answer is to store null and carry on.
  const vehiclesModule = vehicles;
  assert.equal(vehiclesModule.isVehicleBrand("Studebaker"), false);
  assert.equal(vehiclesModule.isVehicleColour("PLAID"), false);
  assert.equal(vehiclesModule.isVehicleSize("HOVERCRAFT"), false);

  const customers = read("src/lib/customers.ts");
  assert.match(customers, /export function vehicleColumnsFrom/);
  assert.match(customers, /isVehicleBrand\(data\.vehicleBrand\) \? data\.vehicleBrand : null/);
  assert.match(customers, /isVehicleColour\(data\.vehicleColour\) \? data\.vehicleColour : null/);
  assert.match(customers, /isVehicleSize\(data\.vehicleSize\) \? data\.vehicleSize : null/);
});

test("only car wash businesses are asked for a plate", () => {
  const { businessTracksVehicles } = vehicles;
  assert.equal(businessTracksVehicles("CAR_CARE_CENTER"), true);
  for (const other of ["COFFEE_SHOP", "RESTAURANT", "BARBERSHOP", "BEAUTY_SALON", "OTHER", null, undefined]) {
    assert.equal(businessTracksVehicles(other), false);
  }

  // Every surface must ask the same predicate, or the form and the search
  // will disagree about whether this business records plates.
  for (const path of [
    "src/app/dashboard/customers/new/page.tsx",
    "src/app/staff/customers/new/page.tsx",
    "src/app/branch/customers/new/page.tsx",
    "src/app/dashboard/customers/[id]/edit/page.tsx",
    "src/components/ScannerManualCustomerSearch.tsx",
  ]) {
    assert.match(read(path), /businessTracksVehicles/, `${path} must gate plate fields on the shared predicate`);
  }
});

test("every write path stores the plate and its derived search key", () => {
  // Manual enrollment (owner, staff and branch all route through this),
  // owner edit, and public self-signup.
  for (const path of ["src/lib/customers.ts", "src/app/dashboard/actions.ts", "src/app/join/program/[token]/actions.ts"]) {
    const source = read(path);
    assert.match(source, /vehicleColumnsFrom\(/, `${path} must write vehicle columns through the shared helper`);
  }

  // One helper builds the columns, so the three write paths cannot drift.
  const customers = read("src/lib/customers.ts");
  assert.match(customers, /vehicleNumber: normalizeVehicleNumber/);
  assert.match(customers, /normalizedPlate: normalizePlate\(/);
  assert.match(customers, /vehicleModel: normalizeVehicleModel/);

  // An edit form that never rendered the plate fields must not blank a plate
  // that is already on file.
  assert.match(read("src/app/dashboard/actions.ts"), /vehicleFieldsSubmitted/);
  assert.match(read("src/components/VehiclePlateFields.tsx"), /name="vehicleFieldsPresent"/);
});

test("a rejected form gives the plate back instead of throwing it away", () => {
  // The counter re-typing a plate because the phone number was wrong is the
  // fastest way to make staff stop recording plates at all.
  const customers = read("src/lib/customers.ts");
  assert.match(customers, /export const customerVehicleFormFields/);
  for (const field of ["vehicleEmirate", "vehicleCode", "vehicleNumber", "vehicleBrand", "vehicleModel", "vehicleColour", "vehicleSize"]) {
    assert.match(customers, new RegExp(`"${field}"`), `${field} must be preserved on failure`);
  }

  for (const path of [
    "src/app/dashboard/actions.ts",
    "src/app/staff/customers/actions.ts",
    "src/app/branch/customers/actions.ts",
  ]) {
    assert.match(
      read(path),
      /\.\.\.customerVehicleFormFields/,
      `${path} must preserve the vehicle fields on a failed enrollment`,
    );
  }

  // The form has to read them back for the round trip to close.
  const form = read("src/components/CustomerCreateForm.tsx");
  assert.match(form, /defaultEmirate=\{value\("vehicleEmirate"\)\}/);
  assert.match(form, /defaultNumber=\{value\("vehicleNumber"\)\}/);

  // The emirate select seeds React state from its prop, so it needs a key tied
  // to the submitted value or a rejected form keeps the number and loses the
  // emirate - the worst of both, because the plate looks half-entered.
  assert.match(form, /key=\{`vehicle-\$\{value\("vehicleEmirate"\)\}`\}/);
});

test("plate search is wired into every place staff look a customer up", () => {
  for (const path of [
    "src/app/staff/customers/page.tsx",
    "src/app/dashboard/customers/page.tsx",
    "src/components/ScannerManualCustomerSearch.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /parsePlateQuery/, `${path} must parse the plate query`);
    assert.match(source, /normalizedPlate:/, `${path} must match the exact plate key`);
    assert.match(source, /vehicleNumber:/, `${path} must match on the digits alone`);
  }
});

test("the plate index is additive and deliberately not unique", () => {
  const migration = read("prisma/migrations/0047_customer_vehicle/migration.sql");
  const schema = read("prisma/schema.prisma");

  assert.match(migration, /CREATE TYPE "VehicleEmirate"/);
  assert.match(migration, /ADD COLUMN "normalized_plate"/);
  for (const column of ["vehicle_brand", "vehicle_model", "vehicle_colour", "vehicle_size"]) {
    assert.match(migration, new RegExp(`ADD COLUMN "${column}"`), `${column} must be added`);
  }

  // Colour and size are closed sets and get enums; brand and model are open
  // sets and stay TEXT, so a new brand is a code edit, not a migration.
  assert.match(migration, /CREATE TYPE "VehicleColour"/);
  assert.match(migration, /CREATE TYPE "VehicleSize"/);
  assert.doesNotMatch(migration, /CREATE TYPE "VehicleBrand"/, "brands must not be a database enum");
  assert.match(migration, /ADD COLUMN "vehicle_brand"\s+TEXT/);
  assert.doesNotMatch(
    migration,
    /ADD COLUMN[^,;]*NOT NULL/,
    "vehicle columns must be nullable so existing customers are untouched",
  );
  assert.doesNotMatch(migration, /CREATE UNIQUE INDEX/, "cars are sold and families share them - the plate is not unique");
  assert.match(migration, /WHERE "normalized_plate" IS NOT NULL/, "index only the rows that have a plate");
  assert.match(schema, /@@index\(\[businessId, normalizedPlate\]\)/);
});

test("the production migration helper cannot be pointed at the wrong database", () => {
  const script = read("scripts/db/migrate-production.mjs");

  // Local .env points DATABASE_URL at a dev branch, so a plain
  // `prisma migrate deploy` migrates dev and leaves production behind.
  assert.match(script, /PRODUCTION_DATABASE_URL/);
  assert.match(script, /migrate", "status"/, "the default run must be a dry run");
  assert.match(script, /--apply/, "applying must take an explicit flag");
  assert.match(script, /devHost === host/, "must refuse when dev and production are the same database");
});
