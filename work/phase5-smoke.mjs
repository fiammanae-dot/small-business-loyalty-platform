import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const envValue = (key) => env.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
process.env.DATABASE_URL = envValue("DATABASE_URL");
const sessionSecret = envValue("SESSION_SECRET") ?? "development-session-secret-change-me";
const baseUrl = "https://app.yourdomain.com";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

async function getText(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  return { status: response.status, location: response.headers.get("location"), text: await response.text() };
}

function visibleText(html) {
  return html.replace(/<!--.*?-->/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

try {
  const context = await pool.query(`
    select
      b.id as business_id,
      b.business_type,
      bo.id as owner_id,
      bo.role as owner_role,
      bo.session_version as owner_session_version,
      bm.id as manager_id,
      bm.role as manager_role,
      bm.session_version as manager_session_version,
      st.id as staff_id,
      st.role as staff_role,
      st.session_version as staff_session_version,
      br.id as branch_id
    from businesses b
    join users bo on bo.business_id = b.id and bo.role = 'BUSINESS_OWNER'
    join users bm on bm.business_id = b.id and bm.role = 'BRANCH_MANAGER'
    join users st on st.business_id = b.id and st.role = 'STAFF'
    join branches br on br.id = bm.branch_id and br.id = st.branch_id
    order by b.id desc
    limit 1
  `);
  if (!context.rows[0]) throw new Error("Need a business with owner, branch manager, staff, and shared branch.");
  const ctx = context.rows[0];

  const customer = await pool.query(`
    select id, uuid, card_token
    from business_customer_memberships
    where business_id = $1 and created_branch_id = $2 and status = 'ACTIVE'
    order by created_at desc
    limit 1
  `, [ctx.business_id, ctx.branch_id]);
  if (!customer.rows[0]) throw new Error("Need a branch customer membership for smoke test.");

  const suffix = Date.now();
  const program = await pool.query(`
    insert into loyalty_programs
      (uuid, business_id, name, business_type, product_or_service_name, description, required_stamps, starting_bonus_stamps, reward_name, reward_description, active, created_at, updated_at)
    values
      ($1, $2, $3, $4, 'Coffee', 'Phase 5 smoke program', 12, 2, 'Free Coffee', 'Free Coffee after completing the card.', true, now(), now())
    returning id, uuid
  `, [randomUUID(), ctx.business_id, `Phase 5 Coffee Club ${suffix}`, ctx.business_type]);

  const enrollment = await pool.query(`
    insert into customer_program_memberships
      (uuid, business_customer_membership_id, loyalty_program_id, earned_stamps, bonus_stamps, enrollment_source, status, enrolled_at, created_at, updated_at)
    values
      ($1, $2, $3, 0, 2, 'OWNER', 'ACTIVE', now(), now(), now())
    on conflict (business_customer_membership_id, loyalty_program_id) do update set updated_at = now()
    returning earned_stamps, bonus_stamps
  `, [randomUUID(), customer.rows[0].id, program.rows[0].id]);

  const totalProgressColumn = await pool.query(`
    select count(*)::int as count
    from information_schema.columns
    where table_name = 'customer_program_memberships'
      and column_name = 'total_progress'
  `);

  const ownerCookie = sessionCookie({ id: ctx.owner_id, role: ctx.owner_role, session_version: ctx.owner_session_version });
  const managerCookie = sessionCookie({ id: ctx.manager_id, role: ctx.manager_role, session_version: ctx.manager_session_version });
  const staffCookie = sessionCookie({ id: ctx.staff_id, role: ctx.staff_role, session_version: ctx.staff_session_version });

  const ownerProgram = await getText(`/dashboard/programs/${program.rows[0].uuid}`, ownerCookie);
  const ownerCustomers = await getText(`/dashboard/programs/${program.rows[0].uuid}/customers`, ownerCookie);
  const ownerCustomerProfile = await getText(`/dashboard/customers/${customer.rows[0].uuid}`, ownerCookie);
  const publicCard = await getText(`/card/${customer.rows[0].card_token}`);
  const managerPrograms = await getText("/branch/programs", managerCookie);
  const managerCustomers = await getText(`/branch/programs/${program.rows[0].uuid}/customers`, managerCookie);
  const staffPrograms = await getText("/staff/programs", staffCookie);
  const staffDenied = await getText(`/dashboard/programs/${program.rows[0].uuid}/customers`, staffCookie);

  console.log(JSON.stringify({
    programUuid: program.rows[0].uuid,
    customerUuid: customer.rows[0].uuid,
    earnedStamps: enrollment.rows[0].earned_stamps,
    bonusStamps: enrollment.rows[0].bonus_stamps,
    dynamicProgress: Number(enrollment.rows[0].earned_stamps) + Number(enrollment.rows[0].bonus_stamps),
    totalProgressColumnExists: totalProgressColumn.rows[0].count > 0,
    ownerProgram: { status: ownerProgram.status, hasProgram: ownerProgram.text.includes("Phase 5 Coffee Club") },
    ownerCustomers: { status: ownerCustomers.status, hasProgress: visibleText(ownerCustomers.text).includes("2 / 12") },
    ownerCustomerProfile: { status: ownerCustomerProfile.status, hasProgress: visibleText(ownerCustomerProfile.text).includes("2 / 12") },
    publicCard: { status: publicCard.status, hasProgress: visibleText(publicCard.text).includes("2 / 12"), hasReward: publicCard.text.includes("Free Coffee") },
    managerPrograms: { status: managerPrograms.status, hasProgram: managerPrograms.text.includes("Phase 5 Coffee Club") },
    managerCustomers: { status: managerCustomers.status, hasProgress: visibleText(managerCustomers.text).includes("2 / 12") },
    staffPrograms: { status: staffPrograms.status, hasProgram: staffPrograms.text.includes("Phase 5 Coffee Club") },
    staffCannotAccessOwnerEnrollment: { status: staffDenied.status, location: staffDenied.location },
  }, null, 2));
} finally {
  await pool.end();
}
