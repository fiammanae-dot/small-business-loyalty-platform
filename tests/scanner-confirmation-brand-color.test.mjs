import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("scanner confirmation modal resolves its theme from business branding, not the card-theme preset catalog", () => {
  const scan = read("src/app/scan/[token]/page.tsx");

  assert.match(scan, /import \{ businessOwnerOperationalDefaults, resolveBusinessBranding \} from "@\/lib\/business-branding";/);
  assert.match(
    scan,
    /function buildScannerConfirmationTheme\(branding: ReturnType<typeof resolveBusinessBranding>\): ConfirmationDialogTheme \{\s*const background = branding\.buttonColor \|\| branding\.primaryColor;/,
  );

  // Regression guard: the wallet card-theme preset catalog (resolveCardThemeColors)
  // has its own hardcoded CTA colors per style (e.g. "#34D399" green for
  // modern-clean) that are unrelated to the business's real brand color. The
  // scanner confirmation modal must never source its button color from there
  // again, or it will drift from the .business-button trigger button.
  assert.doesNotMatch(scan, /resolveCardThemeColors/);
  assert.doesNotMatch(scan, /asCardDesignInput/);
});

test("scanner confirmation theme is built from the same branding record and role default as the trigger button", () => {
  const scan = read("src/app/scan/[token]/page.tsx");
  const callSite = scan.slice(scan.indexOf("const scannerConfirmationTheme ="), scan.indexOf("const scannerConfirmationTheme =") + 260);

  assert.match(
    callSite,
    /buildScannerConfirmationTheme\(\s*resolveBusinessBranding\(\s*businessMembership\.business\.branding,\s*authUser\.role === "BUSINESS_OWNER" \? businessOwnerOperationalDefaults : undefined,\s*\),\s*\);/,
  );
});

test("Issue Stamp and Issue Stamp & Share confirm buttons both receive the resolved brand theme", () => {
  const scan = read("src/app/scan/[token]/page.tsx");

  const issueStampIndex = scan.indexOf('confirmLabel="Issue Stamp"');
  const issueStampBlock = scan.slice(issueStampIndex, issueStampIndex + 250);
  assert.match(issueStampBlock, /confirmationTheme=\{confirmationTheme\}/);

  const shareIndex = scan.indexOf('confirmLabel="Issue Stamp & Share"');
  const shareBlock = scan.slice(shareIndex, shareIndex + 250);
  assert.match(shareBlock, /confirmationTheme=\{confirmationTheme\}/);
});

test("confirmation dialog keeps the cancel button neutral and untouched by the theme", () => {
  const dialog = read("src/components/ui/ConfirmationDialog.tsx");
  const cancelIndex = dialog.indexOf('<Button variant="outline"');
  const cancelBlock = dialog.slice(cancelIndex, cancelIndex + 120);

  assert.match(cancelBlock, /<Button variant="outline" onClick=\{\(\) => setOpen\(false\)\}>\s*\{cancelLabel\}/);
  assert.doesNotMatch(cancelBlock, /themeStyle/);
  assert.doesNotMatch(cancelBlock, /confirmation-background/);
});

test("confirmation dialog's themed disabled state still resolves to a dimmed brand color", () => {
  const dialog = read("src/components/ui/ConfirmationDialog.tsx");

  assert.match(dialog, /"--confirmation-disabled-background": theme\.disabledBackground \?\? theme\.background,/);
  assert.match(dialog, /disabled:\[background:var\(--confirmation-disabled-background\)\]/);
});
