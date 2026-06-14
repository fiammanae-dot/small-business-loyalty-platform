import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const envValue = (key) => env.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
process.env.DATABASE_URL = envValue("DATABASE_URL");
const sessionSecret = envValue("SESSION_SECRET") ?? "development-session-secret-change-me";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const baseUrl = "https://app.yourdomain.com";

function sessionCookie(user) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    role: user.role,
    sessionVersion: user.session_version,
    exp,
  })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `loyalty_session=${payload}.${signature}`;
}

function visibleText(html) {
  return html.replace(/<!--.*?-->/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

try {
  const row = await pool.query(`
    select
      lp.id,
      lp.uuid,
      lp.name,
      lp.required_stamps,
      lp.reward_name,
      lp.active,
      u.id as owner_id,
      u.role as owner_role,
      u.session_version
    from loyalty_programs lp
    join users u on u.business_id = lp.business_id and u.role = 'BUSINESS_OWNER'
    where exists (
      select 1 from customer_program_memberships cpm where cpm.loyalty_program_id = lp.id
    )
    order by lp.created_at desc
    limit 1
  `);
  if (!row.rows[0]) throw new Error("No loyalty program with memberships found.");
  const program = row.rows[0];

  const metrics = await pool.query(`
    select
      count(*)::int as enrolled_customers,
      count(*) filter (where status = 'ACTIVE')::int as active_customers,
      count(*) filter (where status = 'COMPLETED')::int as completed_customers,
      coalesce(avg(earned_stamps + bonus_stamps), 0)::float as average_progress,
      coalesce(sum(bonus_stamps), 0)::int as bonus_stamps_issued,
      coalesce(sum(earned_stamps), 0)::int as earned_stamps,
      count(*) filter (where earned_stamps + bonus_stamps is null)::int as invalid_progress_rows
    from customer_program_memberships
    where loyalty_program_id = $1
  `, [program.id]);

  const totalProgressColumn = await pool.query(`
    select count(*)::int as count
    from information_schema.columns
    where table_name = 'customer_program_memberships'
      and column_name = 'total_progress'
  `);

  const page = await fetch(`${baseUrl}/dashboard/programs/${program.uuid}`, {
    redirect: "manual",
    headers: { cookie: sessionCookie({ id: program.owner_id, role: program.owner_role, session_version: program.session_version }) },
  });
  const pageText = visibleText(await page.text());
  const average = Number.isInteger(metrics.rows[0].average_progress)
    ? String(metrics.rows[0].average_progress)
    : metrics.rows[0].average_progress.toFixed(1);

  console.log(JSON.stringify({
    programUuid: program.uuid,
    status: page.status,
    expected: metrics.rows[0],
    totalProgressColumnExists: totalProgressColumn.rows[0].count > 0,
    rendered: {
      hasProgramStatusSection: pageText.includes("Program Status"),
      hasEnrolledCustomers: pageText.includes(`Enrolled Customers ${metrics.rows[0].enrolled_customers}`),
      hasActiveCustomers: pageText.includes(`Active Customers ${metrics.rows[0].active_customers}`),
      hasCompletedCustomers: pageText.includes(`Completed Customers ${metrics.rows[0].completed_customers}`),
      hasAverageProgress: pageText.includes(`Average Progress ${average} / ${program.required_stamps}`),
      hasBonusStampsIssued: pageText.includes(`Bonus Stamps Issued ${metrics.rows[0].bonus_stamps_issued}`),
      hasEarnedStamps: pageText.includes(`Earned Stamps ${metrics.rows[0].earned_stamps}`),
      hasRewardName: pageText.includes(`Reward Name ${program.reward_name}`),
      hasProgramStatus: pageText.includes(`Program Status ${program.active ? "Active" : "Inactive"}`),
      hasCustomerTable: pageText.includes("Customer Progress Bonus Earned Status Enrolled"),
    },
  }, null, 2));
} finally {
  await pool.end();
}
