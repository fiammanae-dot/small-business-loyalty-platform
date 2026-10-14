/**
 * Every public website page shows the floating "Chat on WhatsApp" button that
 * business owners already know from their dashboard, opening a chat with the
 * sales number and a pre-filled greeting.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the floating button opens WhatsApp with the sales number and a greeting", () => {
  const source = read("src/components/marketing/WhatsAppFloat.tsx");
  assert.match(source, /WEBSITE_WHATSAPP_NUMBER = "971505009707"/);
  assert.match(source, /https:\/\/wa\.me\/\$\{WEBSITE_WHATSAPP_NUMBER\}\?text=\$\{encodeURIComponent\(GREETING\)\}/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /className="fixed bottom-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\] right-4 z-40/);
});

test("the home page and every marketing page render it", () => {
  assert.match(read("src/app/page.tsx"), /<WhatsAppFloat \/>\s*<\/main>/);
  const layout = read("src/components/marketing/MarketingLayout.tsx");
  assert.match(layout, /<MarketingFooter \/>\s*<\/div>\s*<WhatsAppFloat \/>\s*<\/main>/);
});
