/**
 * Diagnose a business phone number's Cloud API state, and optionally register it.
 *
 * An unregistered number returns Meta error 133010 "Account not registered" on
 * every send. platform_type: NOT_APPLICABLE is the tell; registered reads CLOUD_API.
 *
 *   node scripts/whatsapp/register-number.mjs --phone-number-id <id> --waba-id <id> \
 *     --token-file ./wa-token.txt [--register <6-digit-PIN>]
 *
 * Read-only without --register. Never prints the token.
 */
import { parseArgs, require_, readSecretFile } from "./_args.mjs";

const USAGE = `Usage:
  node scripts/whatsapp/register-number.mjs --phone-number-id <id> --waba-id <id> \\
    --token-file <path> [--register <6-digit-PIN>]`;

const args = parseArgs();
const phoneNumberId = require_(args, "phone-number-id", USAGE);
const wabaId = require_(args, "waba-id", USAGE);
const tokenFile = require_(args, "token-file", USAGE);
const pin = args.register ?? null;
const V = args["api-version"] ?? "v21.0";

let token;
try { token = readSecretFile(tokenFile); }
catch (error) { console.error(String(error.message)); process.exit(1); }
const auth = { Authorization: `Bearer ${token}` };

async function get(url) {
  const response = await fetch(url, { headers: auth });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

console.log("=== 1. Can the token see the phone number? ===");
const info = await get(`https://graph.facebook.com/${V}/${phoneNumberId}?fields=id,display_phone_number,verified_name,status,code_verification_status,platform_type,quality_rating,throughput`);
console.log("HTTP", info.status);
console.log(JSON.stringify(info.body, null, 2));
if (info.body?.platform_type === "CLOUD_API") console.log("\n-> Already registered for Cloud API.");
else if (info.body?.platform_type) console.log(`\n-> platform_type is ${info.body.platform_type}; the number is NOT registered for Cloud API.`);

console.log("\n=== 2. Phone numbers on this WABA ===");
const list = await get(`https://graph.facebook.com/${V}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,status,platform_type`);
console.log("HTTP", list.status);
console.log(JSON.stringify(list.body, null, 2));

console.log("\n=== 3. Message templates on this WABA ===");
const templates = await get(`https://graph.facebook.com/${V}/${wabaId}/message_templates?fields=name,status,language,category,components&limit=25`);
console.log("HTTP", templates.status);
if (Array.isArray(templates.body?.data)) {
  for (const template of templates.body.data) {
    console.log(` - ${template.name} | ${template.language} | ${template.status} | ${template.category}`);
    const body = (template.components || []).find((c) => c.type === "BODY");
    const buttons = (template.components || []).find((c) => c.type === "BUTTONS");
    if (body) console.log(`     BODY: ${body.text}`);
    if (buttons) console.log(`     BUTTONS: ${JSON.stringify(buttons.buttons)}`);
  }
} else console.log(JSON.stringify(templates.body, null, 2));

if (!pin) {
  console.log("\nRead-only run. To register the number:");
  console.log("   ... --register <6-digit-PIN>");
  process.exit(0);
}

if (!/^\d{6}$/.test(pin)) { console.error("\nPIN must be exactly 6 digits."); process.exit(1); }

console.log("\n=== 4. Registering the number with Cloud API ===");
const registration = await fetch(`https://graph.facebook.com/${V}/${phoneNumberId}/register`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ messaging_product: "whatsapp", pin }),
});
console.log("HTTP", registration.status);
console.log(JSON.stringify(await registration.json().catch(() => ({})), null, 2));
console.log("\nIf that returned success:true, the number can send. Record the PIN - it is the");
console.log("account's two-step verification PIN and is needed to re-register or migrate later.");
