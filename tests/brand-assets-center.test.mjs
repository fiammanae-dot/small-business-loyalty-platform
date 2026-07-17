import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("brand assets center lives under business settings with its own category", () => {
  const page = read("src/app/dashboard/settings/page.tsx");

  assert.match(page, /\{ key: "brand", label: "Brand Assets", icon: Palette \}/);
  assert.match(page, /activeCategory === "brand"/);
  assert.match(page, /<BrandAssetsCenter/);
  assert.match(page, /CsrfInput scope="dashboard:brand-assets"/);
  assert.match(page, /branding: "brand"/, "the old ?tab=branding deep link must land on the Brand Assets tab");
  assert.match(page, /Open Brand Assets/, "the General tab points to Brand Assets instead of duplicating the settings");
  assert.doesNotMatch(page, /function ColorItem/, "the read-only color list is replaced by the editable center");
});

test("brand assets center reuses the existing logo upload and avatar systems", () => {
  const center = read("src/components/BrandAssetsCenter.tsx");

  assert.match(center, /BusinessLogoUploadField/, "no second upload system");
  assert.match(center, /BusinessLogoAvatar/, "preview uses the shared logo renderer");
  assert.match(center, /saveBrandAssetsAction/);
  assert.match(center, /type="color"/, "real color pickers");
  assert.match(center, /pattern="\^#\[0-9A-Fa-f\]\{6\}\$"/, "hex value inputs");
  assert.match(center, /lg:sticky lg:top-6/, "live preview panel is sticky on desktop");
  assert.match(center, /Coming Soon/);
  for (const asset of ["Light Logo", "Dark Logo", "Email Logo", "Website Favicon", "Business Cover Image"]) {
    assert.match(center, new RegExp(asset), `future asset placeholder: ${asset}`);
  }
});

test("brand assets stay business identity only - no Design Studio program settings", () => {
  const center = read("src/components/BrandAssetsCenter.tsx");

  for (const programSetting of ["stampIcon", "layoutStyle", "stampJourneyStyle", "typographyPreset", "backgroundPattern", "visibleSections", "designStudio"]) {
    assert.doesNotMatch(center, new RegExp(programSetting), `${programSetting} belongs to the Design Studio, not Brand Assets`);
  }
});

test("saving brand assets is owner-scoped, validated by the shared schemas, and audited", () => {
  const actions = read("src/app/dashboard/actions.ts");

  assert.match(actions, /export async function saveBrandAssetsAction/);
  assert.match(actions, /validateActionSecurity\(formData, "dashboard:brand-assets"/);
  assert.match(actions, /brandColorSchema/, "colors validate through the shared branding schema");
  assert.match(actions, /brandLogoUrlSchema/);
  assert.match(actions, /businessBranding\.upsert\(\{\s*where: \{ businessId: user\.businessId \}/s, "writes are tenant-scoped to the owner's own business");
  assert.match(actions, /BUSINESS_BRAND_ASSETS_UPDATED/);
});

test("branding validation has a single source shared by both writers", () => {
  const lib = read("src/lib/branding-validation.ts");
  const platformActions = read("src/app/platform/businesses/actions.ts");
  const dashboardActions = read("src/app/dashboard/actions.ts");

  assert.match(lib, /export const brandColorSchema/);
  assert.match(lib, /export const brandLogoUrlSchema/);
  assert.match(platformActions, /from "@\/lib\/branding-validation"/);
  assert.match(dashboardActions, /from "@\/lib\/branding-validation"/);
  assert.doesNotMatch(platformActions, /regex\(\/\^#\[0-9A-Fa-f\]\{6\}\$\//, "the platform actions must not keep a duplicate color regex");
});

test("logo upload accepts exactly the two branding editors and no other scope", () => {
  const upload = read("src/app/platform/businesses/logo-actions.ts");

  assert.match(upload, /"platform:businesses", "dashboard:brand-assets"/);
  assert.match(upload, /PLATFORM_OWNER/);
  assert.match(upload, /BUSINESS_OWNER/);
  assert.doesNotMatch(upload, /STAFF|BRANCH_MANAGER/, "staff and branch managers cannot upload business logos");
});
