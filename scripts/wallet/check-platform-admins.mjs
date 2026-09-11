/** Read-only: who can administer the platform, and their 2FA state. */
import pg from "pg";
import { readFileSync } from "node:fs";
const url = readFileSync(".env","utf8").match(/^DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
const c = new pg.Client({ connectionString: url });
await c.connect();

const owners = (await c.query(`
  select id, name, email, role, status, two_factor_enabled, last_login_at, force_password_change, created_at
  from users where role = 'PLATFORM_OWNER' order by id`)).rows;

console.log("PLATFORM_OWNER accounts:", owners.length);
for (const r of owners) {
  const mask = r.email.replace(/^(.).*(@.*)$/, "$1***$2");
  console.log(` - id ${r.id} | ${mask} | name: ${r.name} | status: ${r.status} | 2FA: ${r.two_factor_enabled}`);
  console.log(`     last login: ${r.last_login_at ? r.last_login_at.toISOString().slice(0,16).replace("T"," ") : "NEVER"} | must change password: ${r.force_password_change} | created: ${r.created_at.toISOString().slice(0,10)}`);
}

const roles = (await c.query(`select role, status, count(*)::int as n from users group by role, status order by role`)).rows;
console.log("\nall users by role:");
for (const r of roles) console.log(`   ${r.role.padEnd(16)} ${String(r.status).padEnd(10)} ${r.n}`);
await c.end();
