import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (match) process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(`
    select
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      b.name as business,
      br.name as branch
    from users u
    left join businesses b on b.id = u.business_id
    left join branches br on br.id = u.branch_id
    order by
      case u.role
        when 'PLATFORM_OWNER' then 1
        when 'BUSINESS_OWNER' then 2
        when 'BRANCH_MANAGER' then 3
        when 'STAFF' then 4
        else 5
      end,
      u.created_at,
      u.id
  `);

  console.log(JSON.stringify(result.rows, null, 2));
} finally {
  await pool.end();
}
