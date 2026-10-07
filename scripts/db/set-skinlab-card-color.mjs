/**
 * Repaint the Skin Lab Demo CARD BACKGROUND to the client's reference
 * periwinkle (#6F86B0) across every surface - web customer card, Google Wallet
 * and Apple Wallet. All three anchor the card background on branding.primaryColor
 * (the web gradient's first stop, Google's hexBackgroundColor, and the Apple
 * pass color), so this repaints primary + secondary to the periwinkle while
 * keeping the navy buttons and white page background.
 *
 * TARGETS PRODUCTION (PRODUCTION_DATABASE_URL), since the demo lives there.
 * Two steps on purpose:
 *   node scripts/db/set-skinlab-card-color.mjs          -> dry run, writes nothing
 *   node scripts/db/set-skinlab-card-color.mjs --apply  -> writes to production
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const APPLY = process.argv.includes("--apply");
const DATABASE_URL = process.env.PRODUCTION_DATABASE_URL;
const nameArg = process.argv.find((a) => a.startsWith("--name="));
const BUSINESS_NAME = nameArg ? nameArg.slice(7) : "The Skin Lab Demo";

const CARD_BG = "#6F86B0"; // client reference periwinkle

if (!DATABASE_URL) {
  console.error("PRODUCTION_DATABASE_URL is not in .env.");
  process.exit(1);
}

const host = (url) => new URL(url).hostname;
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const business = await prisma.business.findFirst({
    where: { name: BUSINESS_NAME },
    include: { branding: true },
  });
  if (!business) {
    console.error(`No business named "${BUSINESS_NAME}" in production.`);
    process.exit(1);
  }

  const update = { primaryColor: CARD_BG, secondaryColor: CARD_BG };

  console.log(`DB host   : ${host(DATABASE_URL)} (PRODUCTION)`);
  console.log(`Business  : ${business.name} (id ${business.id})`);
  console.log(`Current   :`, business.branding
    ? { primaryColor: business.branding.primaryColor, secondaryColor: business.branding.secondaryColor, buttonColor: business.branding.buttonColor }
    : "(no branding row)");
  console.log(`New       :`, { ...update, buttonColor: business.branding?.buttonColor ?? "(unchanged)" });

  if (!APPLY) {
    console.log("\nDRY RUN - nothing written. Re-run with --apply to write to production.");
  } else {
    if (!business.branding) {
      console.error("No branding row exists for this business.");
      process.exit(1);
    }
    await prisma.businessBranding.update({ where: { businessId: business.id }, data: update });
    console.log("\nSAVED. Card background is now periwinkle across web, Google and Apple.");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
