/**
 * Read-only. Lists anything created in the DEV database in the last 24 hours.
 *
 * Written after the live site briefly pointed at the dev database: if a real
 * customer had signed up or collected a stamp in that window, the row would
 * have landed here instead of production, and it would carry today's date.
 *
 *   node scripts/db/check-dev-strays.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env.");

const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const pool = new pg.Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  console.log("");
  console.log(`dev database : ${new URL(url).hostname}`);
  console.log(`looking for anything created since ${since.toISOString().slice(0, 16).replace("T", " ")} UTC`);
  console.log("");

  const rows = {
    "new customers": await prisma.globalCustomer.count({ where: { createdAt: { gte: since } } }),
    "new customer records at a business": await prisma.businessCustomerMembership.count({ where: { createdAt: { gte: since } } }),
    "stamps given": await prisma.stampTransaction.count({ where: { createdAt: { gte: since } } }),
    "rewards redeemed": await prisma.rewardRedemption.count({ where: { redeemedAt: { gte: since } } }),
    "QR scans": await prisma.scanEvent.count({ where: { createdAt: { gte: since } } }),
    "new businesses": await prisma.business.count({ where: { createdAt: { gte: since } } }),
    "new logins created": await prisma.user.count({ where: { createdAt: { gte: since } } }),
  };

  let total = 0;
  for (const [label, count] of Object.entries(rows)) {
    console.log(`  ${String(count).padStart(4)}  ${label}`);
    total += count;
  }

  console.log("");
  console.log(
    total === 0
      ? "CLEAN - nothing real landed in the dev database while the site was pointed at it."
      : "Some rows above were created in the last 24 hours. Some may be your own testing;\nanything you do not recognise came from the live site during the mix-up.",
  );
} finally {
  await prisma.$disconnect();
  await pool.end();
}
