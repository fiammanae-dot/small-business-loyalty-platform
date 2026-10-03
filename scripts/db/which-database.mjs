/**
 * Read-only. Prints what is in the dev database and what is in production,
 * side by side, so you can tell which one the live website is showing.
 *
 * Counts and names only - it never prints a connection string or a password,
 * and it never writes anything.
 *
 *   node scripts/db/which-database.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

async function summarise(label, url) {
  if (!url) return { label, error: "not set in .env" };

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const [businesses, users, customers] = await Promise.all([
      prisma.business.findMany({ select: { name: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 10 }),
      prisma.user.count(),
      prisma.globalCustomer.count(),
    ]);
    const total = await prisma.business.count();
    return { label, host: new URL(url).hostname, total, businesses, users, customers };
  } catch (error) {
    return { label, host: new URL(url).hostname, error: error.message?.split("\n")[0] ?? String(error) };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

const results = await Promise.all([
  summarise("DEV        (DATABASE_URL)", process.env.DATABASE_URL),
  summarise("PRODUCTION (PRODUCTION_DATABASE_URL)", process.env.PRODUCTION_DATABASE_URL),
]);

for (const r of results) {
  console.log("");
  console.log("=".repeat(64));
  console.log(r.label);
  if (r.host) console.log(`host       : ${r.host}`);
  if (r.error) {
    console.log(`ERROR      : ${r.error}`);
    continue;
  }
  console.log(`businesses : ${r.total}`);
  console.log(`users      : ${r.users}`);
  console.log(`customers  : ${r.customers}`);
  for (const b of r.businesses) {
    console.log(`   - ${b.name}  (created ${b.createdAt.toISOString().slice(0, 10)})`);
  }
}
console.log("");
console.log("Compare the two lists with what the website shows at /platform/businesses.");
console.log("Whichever list matches is the database the live site is reading.");
