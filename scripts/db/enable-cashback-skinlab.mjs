/**
 * Turn the cashback wallet ON for the Skin Lab demo and seed realistic
 * balances + ledger history, so cashback shows in the dashboard, the scanner,
 * the customer card AND the Google Wallet pass ("Cashback: AED ...").
 *
 * RESUMABLE: it ensures cashback is enabled, then seeds only the customers that
 * have no cashback history yet - so a half-finished run can be finished by
 * running it again, and a fully-seeded demo is a no-op.
 *
 * Prod-guarded exactly like the other demo scripts: it refuses production
 * unless --production is passed.
 *
 *   node scripts/db/enable-cashback-skinlab.mjs --name="The Skin Lab Demo"                   -> dry run (demo DB)
 *   node scripts/db/enable-cashback-skinlab.mjs --name="The Skin Lab Demo" --yes             -> apply (demo DB)
 *   node scripts/db/enable-cashback-skinlab.mjs --production --name="The Skin Lab Demo"       -> dry run (LIVE)
 *   node scripts/db/enable-cashback-skinlab.mjs --production --name="The Skin Lab Demo" --yes -> apply (LIVE)
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const WRITE = process.argv.includes("--yes");
const ALLOW_PRODUCTION = process.argv.includes("--production");
const nameArg = process.argv.find((a) => a.startsWith("--name="));
const BUSINESS_NAME = nameArg ? nameArg.slice(7) : process.env.SEED_DEMO_BUSINESS_NAME || "The Skin Lab";
const DATABASE_URL = ALLOW_PRODUCTION
  ? process.env.PRODUCTION_DATABASE_URL
  : process.env.SEED_DEMO_DATABASE_URL || process.env.DATABASE_URL;

const RATE = 5;          // percent
const CURRENCY = "AED";
const host = (url) => new URL(url).hostname;
const bare = (url) => host(url).replace("-pooler.", ".");
const round2 = (n) => Math.round(n * 100) / 100;
const token = (p) => `${p}_${randomBytes(12).toString("base64url")}`;

// Past bills (AED) per customer, cycled by index - a realistic spread: some
// customers with no cashback yet, others with one or several earns.
const BILL_PATTERNS = [[], [750], [1500, 600], [3000], [900, 1200, 450], [1800]];

if (!DATABASE_URL) { console.error(ALLOW_PRODUCTION ? "PRODUCTION_DATABASE_URL not set." : "No demo DATABASE_URL set."); process.exit(1); }
const prod = process.env.PRODUCTION_DATABASE_URL;
if (!ALLOW_PRODUCTION && prod && bare(DATABASE_URL) === bare(prod)) {
  console.error("Refusing to touch PRODUCTION without --production.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  console.log(`DB host   : ${host(DATABASE_URL)}${ALLOW_PRODUCTION ? "  (PRODUCTION / live site)" : ""}`);
  const business = await prisma.business.findFirst({
    where: { name: BUSINESS_NAME },
    include: {
      cashbackSettings: true,
      branches: { select: { id: true }, orderBy: { id: "asc" }, take: 1 },
      users: { select: { id: true }, orderBy: { id: "asc" }, take: 1 },
    },
  });
  if (!business) { console.error(`No business named "${BUSINESS_NAME}" in this database.`); process.exit(1); }
  const branchId = business.branches[0]?.id ?? null;
  const issuedByUserId = business.users[0]?.id ?? null;

  const customers = await prisma.businessCustomerMembership.findMany({
    where: { businessId: business.id },
    select: { id: true, firstName: true, lastName: true, cashbackBalance: true },
    orderBy: { id: "asc" },
  });

  // Customers that already have cashback history (from a prior run) are left as-is.
  const seededRows = await prisma.cashbackTransaction.findMany({
    where: { businessId: business.id },
    select: { businessCustomerMembershipId: true },
    distinct: ["businessCustomerMembershipId"],
  });
  const seededIds = new Set(seededRows.map((r) => r.businessCustomerMembershipId));

  // Plan earns only for customers with no cashback history yet.
  const plan = customers.map((c, i) => {
    if (seededIds.has(c.id)) return { customer: c, earns: [], finalBalance: Number(c.cashbackBalance), skipped: true };
    const bills = BILL_PATTERNS[i % BILL_PATTERNS.length];
    let balance = 0;
    const earns = bills.map((bill, k) => {
      const amount = round2((bill * RATE) / 100);
      balance = round2(balance + amount);
      return { bill, amount, balanceAfter: balance, invoiceNumber: `TSL-${1000 + i}-${k + 1}` };
    });
    return { customer: c, earns, finalBalance: balance, skipped: false };
  });

  const toAdd = plan.filter((p) => !p.skipped && p.earns.length > 0);
  const totalNew = round2(toAdd.reduce((s, p) => s + p.finalBalance, 0));
  const totalEarns = toAdd.reduce((s, p) => s + p.earns.length, 0);

  console.log(`Business  : ${business.name} (id ${business.id})`);
  console.log(`Cashback  : ${business.cashbackSettings?.enabled ? "already enabled" : "will enable"} at ${RATE}% (${CURRENCY})`);
  console.log(`Already   : ${seededIds.size} customers already have cashback (left untouched)`);
  console.log(`To add    : ${toAdd.length} customers, ${totalEarns} EARN rows, ${CURRENCY} ${totalNew.toFixed(2)}`);

  if (toAdd.length === 0 && business.cashbackSettings?.enabled) {
    console.log("\nNothing to do - cashback is on and every customer is already seeded.");
    process.exit(0);
  }

  if (!WRITE) {
    console.log("\nDRY RUN - nothing written. Re-run with --yes to apply.");
  } else {
    const earnRows = [];
    for (const p of toAdd) {
      for (const e of p.earns) {
        earnRows.push({
          businessId: business.id,
          businessCustomerMembershipId: p.customer.id,
          branchId,
          type: "EARN",
          billAmount: e.bill,
          ratePercent: RATE,
          amount: e.amount,
          balanceAfter: e.balanceAfter,
          currency: CURRENCY,
          invoiceNumber: e.invoiceNumber,
          issuedByUserId,
          idempotencyKey: token("cbk"),
        });
      }
    }
    await prisma.$transaction(
      async (tx) => {
        await tx.businessCashbackSettings.upsert({
          where: { businessId: business.id },
          update: { enabled: true, ratePercent: RATE, currency: CURRENCY },
          create: { businessId: business.id, enabled: true, ratePercent: RATE, currency: CURRENCY },
        });
        if (earnRows.length) await tx.cashbackTransaction.createMany({ data: earnRows });
        for (const p of toAdd) {
          await tx.businessCustomerMembership.update({
            where: { id: p.customer.id },
            data: { cashbackBalance: p.finalBalance },
          });
        }
      },
      { timeout: 120000, maxWait: 20000 },
    );
    console.log("\nSAVED. Cashback is live for the demo. New Google Wallet adds will show the cashback line.");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
