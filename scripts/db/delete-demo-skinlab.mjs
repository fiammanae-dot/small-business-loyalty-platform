/**
 * Tear down the Skin Lab demo - the clean way to remove it from a database
 * after a walkthrough (including from the LIVE site, where it was seeded on
 * purpose with --production).
 *
 * It finds the business by name, deletes its staff/owner users, then deletes
 * the business itself - everything else (branding, programs, memberships,
 * customers, stamp history, settings) is removed by the schema's cascade. All
 * in ONE transaction, so it either fully removes the demo or nothing.
 *
 *   node scripts/db/delete-demo-skinlab.mjs                     -> dry run on the demo DB
 *   node scripts/db/delete-demo-skinlab.mjs --yes               -> delete from the demo DB
 *   node scripts/db/delete-demo-skinlab.mjs --production        -> dry run against the LIVE DB
 *   node scripts/db/delete-demo-skinlab.mjs --production --yes  -> remove the demo from the LIVE site
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const WRITE = process.argv.includes("--yes");
const ALLOW_PRODUCTION = process.argv.includes("--production");
const DATABASE_URL = ALLOW_PRODUCTION
  ? process.env.PRODUCTION_DATABASE_URL
  : process.env.SEED_DEMO_DATABASE_URL || process.env.DATABASE_URL;
const BUSINESS_NAME = "The Skin Lab";
const host = (url) => new URL(url).hostname;

if (!DATABASE_URL) {
  console.error(ALLOW_PRODUCTION ? "PRODUCTION_DATABASE_URL is not set." : "No demo DATABASE_URL set.");
  process.exit(1);
}
const prod = process.env.PRODUCTION_DATABASE_URL;
const bare = (u) => host(u).replace("-pooler.", ".");
if (!ALLOW_PRODUCTION && prod && bare(DATABASE_URL) === bare(prod)) {
  console.error("Refusing to touch PRODUCTION without --production.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const business = await prisma.business.findFirst({
    where: { name: BUSINESS_NAME },
    include: { _count: { select: { users: true, customerMemberships: true, loyaltyPrograms: true, branches: true } } },
  });
  console.log(`DB host   : ${host(DATABASE_URL)}${ALLOW_PRODUCTION ? "  (PRODUCTION)" : ""}`);
  if (!business) {
    console.log(`No business named "${BUSINESS_NAME}" here - nothing to delete.`);
    process.exit(0);
  }
  console.log(`Business  : ${business.name} (id ${business.id})`);
  console.log(`Will remove: ${business._count.users} user(s), ${business._count.branches} branch(es), ` +
    `${business._count.loyaltyPrograms} program(s), ${business._count.customerMemberships} customer(s), and all their history.`);

  if (!WRITE) {
    console.log("\nDRY RUN - nothing deleted. Re-run with --yes to remove.");
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { businessId: business.id } });
      await tx.business.delete({ where: { id: business.id } });
    });
    console.log("\nDELETED. The Skin Lab demo has been removed from this database.");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
