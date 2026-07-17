import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("logo storage validates type, size, and file bytes before saving to platform storage", () => {
  const storage = read("src/lib/logo-storage.ts");

  assert.match(storage, /import "server-only"/);
  assert.match(storage, /LOGO_MAX_BYTES = 2 \* 1024 \* 1024/, "logo uploads are capped at 2MB");
  for (const extension of ['"png"', '"jpg"', '"jpeg"', '"svg"', '"webp"']) {
    assert.match(storage, new RegExp(extension.replace(/"/g, '"')));
  }
  assert.match(storage, /0x89, 0x50, 0x4e, 0x47/, "PNG uploads are verified by magic bytes");
  assert.match(storage, /buffer\[0\] !== 0xff \|\| buffer\[1\] !== 0xd8/, "JPG uploads are verified by magic bytes");
  assert.match(storage, /"RIFF"[\s\S]*"WEBP"/, "WEBP uploads are verified by RIFF header");
  assert.match(storage, /<script\[\\s>\]\|javascript:/, "scripted SVG uploads are rejected");
  assert.match(storage, /randomUUID\(\)/, "stored filenames are unguessable");
  assert.match(storage, /"public", "uploads", "logos"/);
  assert.match(storage, /LOGO_UPLOAD_URL_PREFIX = "\/uploads\/logos\/"/);
});

test("logo upload action is restricted to branding editors and CSRF protected", () => {
  const action = read("src/app/platform/businesses/logo-actions.ts");

  assert.match(action, /"use server"/);
  assert.match(action, /user\.role !== "PLATFORM_OWNER" && user\.role !== "BUSINESS_OWNER"/, "only platform admins and business owners may upload logos");
  assert.match(action, /validateCsrfForm\(formData, scope\)/);
  assert.match(action, /validateLogoFile/);
  assert.match(action, /validateLogoBytes/);
  assert.doesNotMatch(action, /prisma/, "the upload action only stores the file; branding writes stay in the business actions");
});

test("business form uses logo upload instead of a raw URL field, with hidden logoUrl for compatibility", () => {
  const form = read("src/components/BusinessForm.tsx");
  const uploadField = read("src/components/BusinessLogoUploadField.tsx");

  assert.match(form, /BusinessLogoUploadField/);
  assert.doesNotMatch(form, /label="Logo URL"/, "admins upload a file instead of typing a URL");
  assert.match(uploadField, /<input type="hidden" name="logoUrl" value=\{value\} \/>/, "the existing logoUrl field keeps carrying the stored URL");
  assert.match(uploadField, /accept="\.png,\.jpg,\.jpeg,\.svg,\.webp/);
  assert.match(uploadField, /2MB or smaller/);
  assert.match(uploadField, /Change Logo/);
  assert.match(uploadField, /Remove Logo/);
  assert.match(uploadField, /Upload Logo/);
});

test("business branding schema accepts uploaded paths and legacy absolute logo URLs", () => {
  const lib = read("src/lib/branding-validation.ts");
  const actions = read("src/app/platform/businesses/actions.ts");

  assert.match(lib, /startsWith\("\/uploads\/logos\/"\)/);
  assert.match(lib, /https\?:/);
  assert.match(actions, /logoUrl: logoUrlSchema/);
});

test("the shared logo avatar falls back to initials on missing or broken images everywhere", () => {
  const avatar = read("src/components/BusinessLogoAvatar.tsx");

  assert.match(avatar, /onError=\{\(\) => setFailed\(true\)\}/, "a broken logo image must fall back to initials, never a blank circle");
  assert.match(avatar, /useEffect/, "fallback resets when the logo URL changes");

  for (const consumer of [
    "src/components/public-card/LoyaltyWalletCard.tsx",
    "src/components/ProgramDesignStudioForm.tsx",
    "src/components/ProgramCreateWizard.tsx",
    "src/components/BusinessForm.tsx",
    "src/components/BusinessLogoUploadField.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/settings/page.tsx",
    "src/app/referral/[code]/page.tsx",
  ]) {
    assert.match(read(consumer), /BusinessLogoAvatar/, `${consumer} must use the shared logo fallback component`);
  }
  assert.doesNotMatch(read("src/components/public-card/LoyaltyWalletCard.tsx"), /backgroundImage: `url\(\$\{businessLogoUrl\}\)`/, "the public card must not use silent background-image logo rendering");
});

test("business logo rendering is standardized on one component with shared size variants", () => {
  const avatar = read("src/components/BusinessLogoAvatar.tsx");

  assert.match(avatar, /BusinessLogoAvatarSize = "xs" \| "sm" \| "md" \| "lg" \| "xl"/, "sizes come from shared variants, not ad-hoc width\\/height values");
  assert.match(avatar, /sizeClasses\[size\]/);
  assert.match(avatar, /object-contain/, "logos keep their aspect ratio without cropping or stretching");
  assert.doesNotMatch(avatar, /object-cover/, "object-cover would crop rectangular logos");

  const referral = read("src/app/referral/[code]/page.tsx");
  assert.doesNotMatch(referral, /<img\s+src=\{referrer\.business\.branding/, "the referral landing header must use BusinessLogoAvatar, not a raw img");

  // No business-logo render site may bypass the shared component with a raw
  // background-image or img again.
  for (const consumer of [
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/settings/page.tsx",
    "src/components/ProgramDesignStudioForm.tsx",
    "src/components/ProgramCreateWizard.tsx",
    "src/components/BusinessForm.tsx",
  ]) {
    assert.doesNotMatch(read(consumer), /backgroundImage: `url\(\$\{(branding|business\.branding|values)\.?logoUrl/, `${consumer} must not render the logo via background-image`);
  }
});

test("uploaded logos are served sandboxed and remain wallet-compatible", () => {
  const nextConfig = read("next.config.ts");
  const mapper = read("src/lib/google-wallet/mapper.ts");
  const gitignore = read(".gitignore");

  assert.match(nextConfig, /source: "\/uploads\/:path\*"/);
  assert.match(nextConfig, /value: "sandbox"/, "directly opened uploads must never execute active content");
  assert.match(mapper, /absoluteUrl\(branding\.logoUrl, appUrl\)/, "Google Wallet keeps resolving the same branding logo to an absolute HTTPS URL");
  assert.match(gitignore, /\/public\/uploads\//);
});
