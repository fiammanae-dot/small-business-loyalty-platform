/**
 * Google Wallet gives an issuer exactly one picture slot on the card, so a
 * business picks what goes in it: the stamps or a photo of their own. These
 * tests hold that choice together - the form, the validation, the save, the
 * resync and the pass all have to agree, or a business changes the picture and
 * nothing happens on the phone.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("the choice reaches the database from both the create and the edit form", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");

  // Read off the form...
  assert.match(actions, /walletHeroStyle: getString\(formData, "walletHeroStyle"\)/);
  assert.match(actions, /walletPhotoUrl: getString\(formData, "walletPhotoUrl"\)/);

  // ...and written on both paths. Before this, the stamp icon was saved on
  // edit but silently dropped on create, so a new program always started on
  // the default tick however the owner had set it up.
  const create = actions.slice(actions.indexOf("createProgramAction"), actions.indexOf("updateProgramAction"));
  const update = actions.slice(actions.indexOf("updateProgramAction"));
  for (const [name, body] of [["create", create], ["update", update]]) {
    for (const field of ["stampEmoji", "walletHeroStyle", "walletPhotoUrl"]) {
      assert.match(body, new RegExp(`${field}: parsed\\.data\\.${field}`), `${name} must save ${field}`);
    }
  }
});

test("changing the picture resyncs cards that are already in customers' wallets", () => {
  const detection = read("src/lib/wallet-sync/change-detection.ts");
  // The pass points at the picture, so a card issued yesterday keeps showing
  // yesterday's picture unless the change is detected here.
  assert.match(detection, /walletHeroStyle: WalletHeroStyle/);
  assert.match(detection, /before\.walletHeroStyle !== after\.walletHeroStyle/);
  assert.match(detection, /before\.walletPhotoUrl !== after\.walletPhotoUrl/);

  // The before-state has to be read back, or the comparison is against
  // undefined and every save looks like a change.
  const actions = read("src/app/dashboard/programs/actions.ts");
  const update = actions.slice(actions.indexOf("updateProgramAction"));
  const select = update.slice(update.indexOf("select: {"), update.indexOf("if (!program)"));
  assert.match(select, /walletHeroStyle: true/);
  assert.match(select, /walletPhotoUrl: true/);
});

test("a photo choice with no photo falls back to the stamps", () => {
  const mapper = read("src/lib/google-wallet/mapper.ts");
  // Google fetches whatever URL we hand it. An empty or non-https value would
  // leave the card with a broken image where the stamps used to be.
  assert.match(mapper, /const photoUrl =\s*\n\s*membership\.loyaltyProgram\.walletHeroStyle === "PHOTO"/);
  assert.match(mapper, /const stampImage = photoUrl\s*\n\s*\? imageModule\(photoUrl/);

  const programs = read("src/lib/programs.ts");
  // Stored only if it is an https address; anything else becomes null, which
  // is what makes the fallback above reachable rather than theoretical.
  assert.match(programs, /walletPhotoUrl: z[\s\S]{0,200}\/\^https:\\\/\\\/\/i\.test\(value\)/);
});

test("the two pictures share one slot, so the form offers one choice", () => {
  const field = read("src/components/WalletCardPictureField.tsx");
  assert.match(field, /name="walletHeroStyle"/);
  assert.match(field, /name="walletPhotoUrl"/);
  // Both editors go through this one component: two copies would drift, and
  // the create form would end up offering a choice the edit form did not.
  for (const form of ["src/components/ProgramForm.tsx", "src/components/ProgramCreateWizard.tsx"]) {
    const source = read(form);
    assert.match(source, /<WalletCardPictureField/, `${form} must use the shared field`);
    assert.doesNotMatch(source, /<StampIconPicker/, `${form} must not pick an icon outside the choice`);
  }
});

test("the form tells the business what size each picture has to be", () => {
  // Wrong dimensions are the most expensive mistake here: the business only
  // finds out once the card is on a customer's phone.
  const photo = read("src/components/WalletCardPictureField.tsx");
  assert.match(photo, /1032 x 812/, "the card picture needs its pixel size stated");

  const logo = read("src/components/BusinessLogoUploadField.tsx");
  assert.match(logo, /660 x 660/, "the logo needs its pixel size stated");
  assert.match(logo, /circle/i, "the logo notice must say the logo is cropped into a circle");
});

test("an uploaded card picture is checked before it is stored", () => {
  const storage = read("src/lib/logo-storage.ts");
  // Google renders the picture as a bitmap; an SVG arrives broken.
  assert.match(storage, /validateWalletPhotoFile/);
  assert.match(storage, /cannot show SVG/i);
  // A photo needs more room than a logo mark, but not unlimited room.
  assert.match(storage, /WALLET_PHOTO_MAX_BYTES = 4 \* 1024 \* 1024/);

  const action = read("src/app/dashboard/programs/photo-actions.ts");
  assert.match(action, /validateCsrfForm\(formData, "dashboard:programs"\)/);
  // The claimed extension is not trusted: the bytes are checked too.
  assert.match(action, /validateLogoBytes\(buffer, fileCheck\.extension\)/);
  assert.match(action, /user\.role !== "BUSINESS_OWNER"/);
});

test("the two uploads stay in separate folders", () => {
  const storage = read("src/lib/logo-storage.ts");
  // One shared bucket, two kinds of picture: keeping the prefixes apart means
  // a card photo can never be mistaken for a logo when tidying up later.
  assert.match(storage, /folder: "logos" \| "wallet-photos"/);
  assert.match(storage, /saveImageFile\(buffer, extension, "logos"\)/);
  assert.match(storage, /saveImageFile\(buffer, extension, "wallet-photos"\)/);
});
