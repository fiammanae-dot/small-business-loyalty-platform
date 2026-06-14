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

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function sessionCookie(user) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = base64UrlEncode(JSON.stringify({ userId: user.id, role: user.role, exp }));
  return `loyalty_session=${payload}.${sign(payload)}`;
}

async function getText(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  return { status: response.status, text: await response.text(), location: response.headers.get("location") };
}

try {
  const membershipResult = await pool.query(`
    select
      m.id,
      m.uuid,
      m.card_token,
      b.name as business,
      bo.id as owner_id,
      bo.role as owner_role,
      bm.id as manager_id,
      bm.role as manager_role,
      su.id as staff_id,
      su.role as staff_role
    from business_customer_memberships m
    join businesses b on b.id = m.business_id
    join users bo on bo.business_id = m.business_id and bo.role = 'BUSINESS_OWNER'
    left join users bm on bm.business_id = m.business_id and bm.branch_id = m.created_branch_id and bm.role = 'BRANCH_MANAGER'
    left join users su on su.business_id = m.business_id and su.branch_id = m.created_branch_id and su.role = 'STAFF'
    where m.card_token is not null
    order by (bm.id is null), m.created_at desc
    limit 1
  `);
  const membership = membershipResult.rows[0];
  if (!membership) throw new Error("No customer membership with card token found.");

  const validCard = await getText(`/card/${membership.card_token}`);
  const invalidCard = await getText("/card/cst_invalid_phase4b_token");

  await pool.query("update business_customer_memberships set card_status = 'DISABLED' where id = $1", [membership.id]);
  const disabledCard = await getText(`/card/${membership.card_token}`);
  await pool.query("update business_customer_memberships set card_status = 'ACTIVE' where id = $1", [membership.id]);

  const ownerCookie = sessionCookie({ id: membership.owner_id, role: membership.owner_role });
  const ownerProfile = await getText(`/dashboard/customers/${membership.uuid}`, ownerCookie);

  let managerProfile = null;
  if (membership.manager_id) {
    const managerCookie = sessionCookie({ id: membership.manager_id, role: membership.manager_role });
    managerProfile = await getText(`/branch/customers/${membership.uuid}`, managerCookie);
  }
  let staffSuccess = null;
  if (membership.staff_id) {
    const staffCookie = sessionCookie({ id: membership.staff_id, role: membership.staff_role });
    staffSuccess = await getText(`/staff/customers/success?card=${encodeURIComponent(membership.card_token)}`, staffCookie);
  }

  console.log(JSON.stringify({
    sampleCardUrl: `${baseUrl}/card/${membership.card_token}`,
    business: membership.business,
    validCard: {
      status: validCard.status,
      hasBusiness: validCard.text.includes(membership.business),
      hasMaskedPhonePattern: /\+\d+\*+\d{3}/.test(validCard.text),
      hasWalletButtons: validCard.text.includes("Add to Apple Wallet") && validCard.text.includes("Add to Google Wallet"),
      hasWalletMessageSource: validCard.text.includes("Wallet integration coming soon."),
    },
    invalidCard: {
      status: invalidCard.status,
      hasUnavailableMessage: invalidCard.text.includes("Card not available"),
    },
    disabledCard: {
      status: disabledCard.status,
      hasUnavailableMessage: disabledCard.text.includes("Card not available"),
    },
    ownerProfile: {
      status: ownerProfile.status,
      hasCardUrl: ownerProfile.text.includes(`/card/${membership.card_token}`),
      hasDisableEnableControl: ownerProfile.text.includes("Disable card") || ownerProfile.text.includes("Enable card"),
    },
    managerProfile: managerProfile
      ? {
          status: managerProfile.status,
          hasCardUrl: managerProfile.text.includes(`/card/${membership.card_token}`),
          hasDisableEnableControl: managerProfile.text.includes("Disable card") || managerProfile.text.includes("Enable card"),
        }
      : null,
    staffSuccess: staffSuccess
      ? {
          status: staffSuccess.status,
          hasCardUrl: staffSuccess.text.includes(`/card/${membership.card_token}`),
          hasOpenCardButton: staffSuccess.text.includes("Open card"),
          hasWhatsappShare: staffSuccess.text.includes("Share via WhatsApp"),
        }
      : null,
  }, null, 2));
} finally {
  await pool.end();
}
