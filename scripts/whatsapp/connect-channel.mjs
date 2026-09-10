/**
 * Connect a business's WhatsApp channel (manual onboarding, pre-Tech-Provider).
 *
 * Encrypts the Meta access token with the real encryptWhatsAppAccessToken from
 * src/lib/whatsapp/credentials.ts and upserts the business_whatsapp_channels row.
 * Dry run by default; pass --commit to write. Never prints the token.
 *
 *   node scripts/whatsapp/connect-channel.mjs \
 *     --business "Emirates Coffee House" \
 *     --phone-number-id 1324958127363085 \
 *     --waba-id 1739147800641099 \
 *     --token-file ./wa-token.txt \
 *     [--template new_loyalty_card] [--language en] [--commit]
 */
import pg from "pg";
import { parseArgs, require_, fromEnvFile, readSecretFile, importTs } from "./_args.mjs";

const USAGE = `Usage:
  node scripts/whatsapp/connect-channel.mjs --business "<name>" --phone-number-id <id> \\
    --waba-id <id> --token-file <path> [--template new_loyalty_card] [--language en] [--commit]`;

const args = parseArgs();
const businessName = require_(args, "business", USAGE);
const phoneNumberId = require_(args, "phone-number-id", USAGE);
const wabaId = require_(args, "waba-id", USAGE);
const tokenFile = require_(args, "token-file", USAGE);
const templateName = args.template ?? "new_loyalty_card";
const templateLanguage = args.language ?? "en";
const COMMIT = args._flags.has("commit");

const DATABASE_URL = fromEnvFile("DATABASE_URL");
if (!DATABASE_URL) { console.error("DATABASE_URL not found in .env"); process.exit(1); }

const { parseWhatsAppEncryptionKey, encryptWhatsAppAccessToken, decryptWhatsAppAccessToken } =
  await importTs("src/lib/whatsapp/credentials.ts");

const key = parseWhatsAppEncryptionKey(fromEnvFile("WHATSAPP_ENCRYPTION_KEY"));
if (!key) { console.error("WHATSAPP_ENCRYPTION_KEY in .env is missing or not 32 bytes."); process.exit(1); }
console.log("encryption key            : parsed OK (32 bytes)");

let token;
try { token = readSecretFile(tokenFile); }
catch (error) { console.error(String(error.message)); process.exit(1); }
console.log("token file                : read OK, length", token.length,
  token.startsWith("EA") ? "(looks like a Meta token)" : "(WARNING: does not start with 'EA')");

const ciphertext = encryptWhatsAppAccessToken(token, key);
if (decryptWhatsAppAccessToken(ciphertext, key) !== token) {
  console.error("encrypt -> decrypt round trip FAILED"); process.exit(1);
}
console.log("encrypt -> decrypt        : round-trips correctly");

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
console.log("connected to              :", new URL(DATABASE_URL).hostname);

const found = await client.query(`select id, name from businesses where name = $1`, [businessName]);
if (found.rows.length !== 1) {
  console.error(`\nExpected exactly 1 business named "${businessName}", found ${found.rows.length}.`);
  const all = await client.query(`select id, name from businesses order by id limit 40`);
  console.error("Businesses in this database:");
  for (const r of all.rows) console.error("   ", r.id, "|", r.name);
  await client.end(); process.exit(1);
}
const business = found.rows[0];
console.log("business                  :", business.name, `(id ${business.id})`);

const existing = await client.query(
  `select connection_status, welcome_template_name, welcome_template_status
   from business_whatsapp_channels where business_id = $1`, [business.id]);
console.log("existing channel row      :", existing.rows.length ? JSON.stringify(existing.rows[0]) : "none (will insert)");

console.log("\nwill set:");
console.log("   phone_number_id        :", phoneNumberId);
console.log("   waba_id                :", wabaId);
console.log("   connection_status      : CONNECTED");
console.log("   welcome_template_name  :", templateName);
console.log("   welcome_template_lang  :", templateLanguage);
console.log("   welcome_template_status: APPROVED");
console.log("   access_token_encrypted : <ciphertext,", ciphertext.length, "chars>");

if (!COMMIT) {
  console.log("\nDRY RUN - nothing written. Re-run with --commit to apply.");
  await client.end(); process.exit(0);
}

await client.query(
  `insert into business_whatsapp_channels
     (uuid, business_id, provider, phone_number_id, waba_id, access_token_encrypted,
      connection_status, welcome_template_name, welcome_template_language,
      welcome_template_status, last_error_message, created_at, updated_at)
   values (gen_random_uuid(), $1, 'META_CLOUD_API', $2, $3, $4,
      'CONNECTED', $5, $6, 'APPROVED', null, now(), now())
   on conflict (business_id) do update set
      phone_number_id = excluded.phone_number_id,
      waba_id = excluded.waba_id,
      access_token_encrypted = excluded.access_token_encrypted,
      connection_status = excluded.connection_status,
      welcome_template_name = excluded.welcome_template_name,
      welcome_template_language = excluded.welcome_template_language,
      welcome_template_status = excluded.welcome_template_status,
      last_error_message = null,
      updated_at = now()`,
  [business.id, phoneNumberId, wabaId, ciphertext, templateName, templateLanguage]
);

const row = (await client.query(
  `select business_id, provider, phone_number_id, waba_id, connection_status,
          welcome_template_name, welcome_template_language, welcome_template_status,
          access_token_encrypted, created_at, updated_at
   from business_whatsapp_channels where business_id = $1`, [business.id])).rows[0];

console.log("\nWRITTEN. Row now reads:");
for (const [k, v] of Object.entries(row)) {
  if (k === "access_token_encrypted") {
    console.log("   access_token_encrypted :",
      decryptWhatsAppAccessToken(v, key) === token ? "stored ciphertext decrypts back to the token" : "MISMATCH");
  } else console.log("  ", k.padEnd(24), ":", v);
}
await client.end();
console.log(`\nDone. Delete ${tokenFile} now that the token is stored encrypted.`);
