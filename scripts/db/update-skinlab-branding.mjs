/**
 * Repaint the Skin Lab demo with the clinic's REAL brand, pulled from
 * theskinlab.ae: a navy logo/wordmark (#000080) with a periwinkle call-to-
 * action (#7A99F0) on white - not the teal/gold the first seed guessed.
 *
 * TARGET: the DEMO database, never production - it refuses to run against
 * PRODUCTION_DATABASE_URL, exactly like the seed. Idempotent: it only updates
 * the one branding row, by business name.
 *
 *   node scripts/db/update-skinlab-branding.mjs        -> dry run, writes nothing
 *   node scripts/db/update-skinlab-branding.mjs --yes  -> applies the branding
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const WRITE = process.argv.includes("--yes");
const DATABASE_URL = process.env.SEED_DEMO_DATABASE_URL || process.env.DATABASE_URL;
const BUSINESS_NAME = "The Skin Lab";

const BRANDING = {
  logoUrl: "https://theskinlab.ae/wp-content/uploads/2024/12/vectorpaint-5.png",
  primaryColor: "#000080",   // navy - the logo, wordmark, nav and headings
  secondaryColor: "#7A99F0", // periwinkle - the site's accent / CTA
  backgroundColor: "#FFFFFF",
  textColor: "#1A1A1A",
  buttonColor: "#000080",    // navy buttons keep white text crisp and on-brand
};

const host = (url) => new URL(url).hostname.replace("-pooler.", ".");

if (!DATABASE_URL) {
  console.error("No SEED_DEMO_DATABASE_URL or DATABASE_URL set.");
  process.exit(1);
}
if (process.env.PRODUCTION_DATABASE_URL && host(DATABASE_URL) === host(process.env.PRODUCTION_DATABASE_URL)) {
  console.error("Refusing to run against the PRODUCTION database.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const business = await prisma.business.findFirst({
    where: { name: BUSINESS_NAME },
    include: { branding: true },
  });
  if (!business) {
    console.error(`No business named "${BUSINESS_NAME}" in this database.`);
    process.exit(1);
  }
  console.log(`DB host   : ${host(DATABASE_URL)}`);
  console.log(`Business  : ${business.name} (id ${business.id})`);
  console.log(`Current   :`, business.branding
    ? { primaryColor: business.branding.primaryColor, secondaryColor: business.branding.secondaryColor, buttonColor: business.branding.buttonColor }
    : "(no branding row)");
  console.log(`New       :`, { primaryColor: BRANDING.primaryColor, secondaryColor: BRANDING.secondaryColor, buttonColor: BRANDING.buttonColor });

  if (!WRITE) {
    console.log("\nDRY RUN - nothing written. Re-run with --yes to apply.");
  } else {
    await prisma.businessBranding.upsert({
      where: { businessId: business.id },
      update: BRANDING,
      create: { businessId: business.id, ...BRANDING },
    });
    console.log("\nSAVED. The demo now uses the real Skin Lab brand colors.");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
