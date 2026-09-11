/** Read-only: who would be locked out by rotating TWO_FACTOR_ENCRYPTION_KEY. */
import pg from "pg";
import { readFileSync } from "node:fs";
const url = readFileSync(".env","utf8").match(/^DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
const c = new pg.Client({ connectionString: url });
await c.connect();
const rows = (await c.query(`
  select u.id, u.email, u.role, u.two_factor_enabled,
         (select count(*) from two_factor_backup_codes b where b.user_id = u.id and b.used_at is null)::int as unused_codes
  from users u
  where u.two_factor_enabled = true
  order by u.id`)).rows;
console.log("enrolled in 2FA:", rows.length);
for (const r of rows) {
  const mask = r.email.replace(/^(.).*(@.*)$/, "$1***$2");
  console.log(` - id ${r.id} | ${r.role} | ${mask} | unused backup codes: ${r.unused_codes}${r.unused_codes === 0 ? "  <-- WOULD BE LOCKED OUT" : ""}`);
}
if (!rows.length) console.log("\nNobody is enrolled. Rotating is completely safe.");
else if (rows.every(r => r.unused_codes > 0)) console.log("\nEveryone has backup codes - rotation is recoverable.");
await c.end();
