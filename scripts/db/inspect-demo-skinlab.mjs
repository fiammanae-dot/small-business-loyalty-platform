/**
 * Read-only: show what the Skin Lab demo looks like in a database (handy for
 * checking the LIVE site with --production). Writes nothing.
 *
 *   node scripts/db/inspect-demo-skinlab.mjs                -> inspect the demo DB
 *   node scripts/db/inspect-demo-skinlab.mjs --production   -> inspect the LIVE DB
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const ALLOW_PRODUCTION = process.argv.includes("--production");
const DATABASE_URL = ALLOW_PRODUCTION
  ? process.env.PRODUCTION_DATABASE_URL
  : process.env.SEED_DEMO_DATABASE_URL || process.env.DATABASE_URL;
const nameArg = process.argv.find((a) => a.startsWith("--name="));
const BUSINESS_NAME = nameArg ? nameArg.slice(7) : process.env.SEED_DEMO_BUSINESS_NAME || "The Skin Lab";
const host = (url) => new URL(url).hostname;

if (!DATABASE_URL) { console.error("No DATABASE_URL for this target."); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  console.log(`DB host   : ${host(DATABASE_URL)}${ALLOW_PRODUCTION ? "  (PRODUCTION / live site)" : ""}`);
  const b = await prisma.business.findFirst({
    where: { name: BUSINESS_NAME },
    include: {
      branding: true,
      cashbackSettings: true,
      branches: { select: { name: true } },
      users: { select: { email: true, role: true } },
      loyaltyPrograms: { select: { name: true, isMembership: true, requiredStamps: true } },
      _count: { select: { customerMemberships: true } },
    },
  });
  if (!b) { console.log(`No "${BUSINESS_NAME}" in this database.`); process.exit(0); }
  console.log(`Business  : ${b.name} (id ${b.id}), created ${b.createdAt.toISOString().slice(0,10)}`);
  console.log(`Branding  :`, b.branding
    ? { logoUrl: b.branding.logoUrl, primary: b.branding.primaryColor, secondary: b.branding.secondaryColor, button: b.branding.buttonColor }
    : "(none)");
  console.log(`Branches  : ${b.branches.map(x=>x.name).join(", ") || "(none)"}`);
  console.log(`Programs  :`);
  for (const p of b.loyaltyPrograms) {
    console.log(`   - ${p.name}  [${p.isMembership ? "membership" : "stamp"}, ${p.requiredStamps} sessions]`);
  }
  console.log(`Customers : ${b._count.customerMemberships}`);
  const cb = b.cashbackSettings;
  console.log(`Cashback  :`, cb ? { enabled: cb.enabled, rate: `${cb.ratePercent}%`, currency: cb.currency } : "(off / no settings row)");
  const cbAgg = await prisma.businessCustomerMembership.aggregate({ where: { businessId: b.id }, _sum: { cashbackBalance: true } });
  const cbWith = await prisma.businessCustomerMembership.count({ where: { businessId: b.id, cashbackBalance: { gt: 0 } } });
  const cbTxns = await prisma.cashbackTransaction.count({ where: { businessId: b.id } });
  console.log(`   balances: ${cbWith} customers > 0, total ${cb?.currency ?? "AED"} ${Number(cbAgg._sum.cashbackBalance ?? 0).toFixed(2)}, ${cbTxns} ledger rows`);
  console.log(`Logins    :`);
  for (const u of b.users) console.log(`   - ${u.email}  (${u.role})`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
