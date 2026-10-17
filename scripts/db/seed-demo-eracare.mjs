/**
 * Builds a ready-made demo of Era Care (Egyptian skincare & cosmetics brand
 * with its own stores - eracare-eg.com) for a sales pitch.
 *
 *   Era Care - 1 branch (Cairo store), 1 owner login, their coral-and-white
 *   brand colours and logo, ONE stamp card (8 purchases: free lip balm at 4,
 *   free skincare product at 8) with the sparkle stamp icon, and 10 customers
 *   at every level: VIP regulars who already redeemed, Gold customers with a
 *   reward ready or one purchase away, Silver mid-card, and brand-new Bronze
 *   customers.
 *
 * The logo is read from scripts/db/demo-assets/eracare/logo.png and uploaded
 * to the platform's image storage (R2) so the web card and Google/Apple
 * Wallet can load it.
 *
 * Additive only: it never edits or deletes existing rows, refuses to run if
 * the business or login already exists, and writes everything in ONE
 * transaction, so it either all lands or nothing does.
 *
 *   node scripts/db/seed-demo-eracare.mjs                     -> dry run on the dev DB, writes nothing
 *   node scripts/db/seed-demo-eracare.mjs --yes               -> writes to the dev DB
 *   node scripts/db/seed-demo-eracare.mjs --production        -> dry run against the LIVE production DB
 *   node scripts/db/seed-demo-eracare.mjs --production --yes  -> create the demo on the LIVE site
 *
 * Add --no-images when this computer has no image-storage keys: the demo is
 * created without the logo, and you upload it in the app (Settings > Brand
 * Assets).
 */
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const WRITE = process.argv.includes("--yes");
const NO_IMAGES = process.argv.includes("--no-images");
const ALLOW_PRODUCTION = process.argv.includes("--production");
const DATABASE_URL = ALLOW_PRODUCTION
  ? process.env.PRODUCTION_DATABASE_URL
  : process.env.SEED_DEMO_DATABASE_URL || process.env.DATABASE_URL;
const BUSINESS_NAME = "Era Care";
const OWNER_EMAIL = "eracare.demo@loyaltycarduae.com";
const ASSET_DIR = path.join(process.cwd(), "scripts", "db", "demo-assets", "eracare");
const LOGO_FILE = path.join(ASSET_DIR, "logo.png");
const REQUIRED_STAMPS = 8;
const MILESTONE_AT = 4;

class DryRunRollback extends Error {}

const token = (prefix) => `${prefix}_${randomBytes(14).toString("base64url")}`;
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const host = (url) => new URL(url).hostname;

// Era Care's coral on white (from eracare-eg.com) with a deeper coral for
// buttons so white button text stays readable.
const BRANDING = {
  primaryColor: "#F2918C",
  secondaryColor: "#FDE7E6",
  backgroundColor: "#FFFFFF",
  textColor: "#1F1F1F",
  buttonColor: "#D9625E",
};

const REWARDS = {
  milestone: { atStamp: MILESTONE_AT, rewardName: "Free lip balm", rewardDescription: "A free Era Care lip balm with your purchase." },
  full: { atStamp: REQUIRED_STAMPS, rewardName: "Free skincare product", rewardDescription: "Any serum, cream or cleanser from the skincare range, free." },
};

/**
 * Ten customers, one per level. visits = purchases stamped in the last 90
 * days, so the tier matches the tier rules below (Silver 3+, Gold 6+, VIP 10+).
 *   - VIP (11, 10): already redeemed the lip balm and the free product once.
 *   - Gold 8: card full, free product ready to redeem.
 *   - Gold 7: one purchase from the free product.
 *   - Gold 6: collected the lip balm, on the way to the free product.
 *   - Silver 4: lip balm ready to collect.
 *   - Silver 3, Bronze 2 / 1, and a brand-new customer with no purchases yet.
 */
const CUSTOMERS = [
  { firstName: "Mariam", lastName: "Hassan", visits: 11, tier: "VIP", joined: 85 },
  { firstName: "Nour", lastName: "El Sayed", visits: 10, tier: "VIP", joined: 80 },
  { firstName: "Salma", lastName: "Abdelrahman", visits: 8, tier: "GOLD", joined: 70 },
  { firstName: "Yasmin", lastName: "Mostafa", visits: 7, tier: "GOLD", joined: 64 },
  { firstName: "Farida", lastName: "Ibrahim", visits: 6, tier: "GOLD", joined: 58 },
  { firstName: "Habiba", lastName: "Mahmoud", visits: 4, tier: "SILVER", joined: 46 },
  { firstName: "Omar", lastName: "Khalil", visits: 3, tier: "SILVER", joined: 38 },
  { firstName: "Dina", lastName: "Fathy", visits: 2, tier: "BRONZE", joined: 27 },
  { firstName: "Ahmed", lastName: "Samir", visits: 1, tier: "BRONZE", joined: 12 },
  { firstName: "Laila", lastName: "Adel", visits: 0, tier: "BRONZE", joined: 2 },
];

const phoneFor = (index) => `+9715079${String(9001 + index)}`;

/**
 * Where each customer's card stands after their purchases, following the
 * app's rules: the lip balm is claimed at 4 (except Habiba, who has it
 * waiting), and claiming the free product at 8 resets the card.
 */
function cardStateFor(customer) {
  const { visits } = customer;
  if (visits >= REQUIRED_STAMPS + 1) {
    // One full card already completed and both rewards redeemed.
    return { earnedStamps: visits - REQUIRED_STAMPS, claimed: [], redemptions: ["milestone", "full"] };
  }
  if (visits > MILESTONE_AT) {
    return { earnedStamps: visits, claimed: [MILESTONE_AT], redemptions: ["milestone"] };
  }
  return { earnedStamps: visits, claimed: [], redemptions: [] };
}

// Alert policy defaults (same as a business created from the platform).
const ALERT_POLICIES = [
  ["MULTI_STAMP_THRESHOLD", "Several stamps at once", 3, "LOW"],
  ["REPEATED_STAMPS_SHORT_WINDOW", "Repeated stamps within 10 minutes", 3, "MEDIUM"],
  ["CUSTOMER_DAILY_STAMP_LIMIT", "Customer stamps in 24 hours", 8, "HIGH"],
  ["STAFF_DAILY_STAMP_LIMIT", "Staff stamps in 24 hours", 50, "HIGH"],
  ["FAST_REWARD_PROGRESS", "Card filled on the first day", 24, "MEDIUM"],
  ["HIGH_STAMP_UNDO_COUNT", "Undone stamps", 3, "MEDIUM"],
  ["COOLDOWN_VIOLATION_THRESHOLD", "Loyalty rule breaks", 3, "HIGH"],
  ["INVALID_SCAN_THRESHOLD", "Invalid scans", 10, "MEDIUM"],
  ["WRONG_BUSINESS_SCAN_THRESHOLD", "Other businesses' cards", 3, "MEDIUM"],
  ["REFERRAL_ABUSE_THRESHOLD", "Referral volume", 5, "HIGH"],
  ["HIGH_REWARD_ACTIVITY_THRESHOLD", "Rewards redeemed by one staff member", 5, "HIGH"],
  ["CASHBACK_LARGE_BILL", "Cashback on a large bill", 5000, "MEDIUM"],
  ["CASHBACK_FREQUENT_EARN", "Cashback added often", 3, "HIGH"],
  ["CASHBACK_LARGE_REDEMPTION", "Large cashback redemption", 500, "MEDIUM"],
];

/** The Design Studio "Classic" card in the brand colours, with the built-in sparkle icon. */
function cardDesignFor() {
  return {
    version: "v1",
    layoutStyle: "CLASSIC",
    cardStyle: "business-default",
    stampJourneyStyle: "ICON_GRID",
    stampIcon: "SPARKLE",
    progressStyle: "linear",
    typographyPreset: "MODERN",
    backgroundStyle: "SOLID",
    backgroundPattern: "NONE",
    decorationStyle: "FLAT",
    rewardStyle: "FILLED",
    footerStyle: "scan-cta",
    animationStyle: "subtle",
    visibleSections: {
      logo: true, businessName: true, customerName: true, tierBadge: true, rewardBox: true,
      progress: true, qr: true, footer: true, referral: true, visits: true, programName: true,
    },
    templateId: null,
    customStampIconUrl: null,
  };
}

function guardTarget() {
  if (!DATABASE_URL) {
    throw new Error(ALLOW_PRODUCTION ? "--production was passed but PRODUCTION_DATABASE_URL is not set in .env." : "DATABASE_URL is not set in .env.");
  }
  const production = process.env.PRODUCTION_DATABASE_URL;
  if (!production || ALLOW_PRODUCTION) return;
  const bare = (url) => host(url).replace("-pooler.", ".");
  if (bare(DATABASE_URL) === bare(production)) {
    throw new Error(`Refusing to run: DATABASE_URL points at production (${host(DATABASE_URL)}). Pass --production to seed the live site on purpose.`);
  }
}

function readAsset(file, label) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${label}: ${path.relative(process.cwd(), file)}. Put the file there and run again.`);
  }
  return readFileSync(file);
}

/** Uploads a PNG to the platform's image storage, exactly like the app does. */
async function uploadPng(buffer, folder) {
  // Testing aid: write to a local folder (served as R2_PUBLIC_BASE_URL) instead.
  const fakeDir = process.env.SEED_DEMO_FAKE_UPLOAD_DIR;
  if (fakeDir) {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const key = `${folder}/${randomUUID()}.png`;
    mkdirSync(path.join(fakeDir, folder), { recursive: true });
    writeFileSync(path.join(fakeDir, key), buffer);
    return `${process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
  }
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL } = process.env;
  const missing = Object.entries({ R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL })
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
  if (missing.length) throw new Error(`Image storage is not configured in .env (missing ${missing.join(", ")}).`);
  const key = `${folder}/${randomUUID()}.png`;
  const client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
}

async function main() {
  guardTarget();
  console.log("");
  console.log(`target      : ${host(DATABASE_URL)}`);
  console.log(ALLOW_PRODUCTION ? "             (PRODUCTION - the LIVE site, on purpose via --production)" : "             (dev database - production needs --production)");
  console.log(`mode        : ${WRITE ? "WRITE" : "dry run - nothing will be saved or uploaded"}`);
  console.log("");

  const logo = NO_IMAGES ? null : readAsset(LOGO_FILE, "logo");

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const clashes = [];
    if (await prisma.business.findFirst({ where: { name: BUSINESS_NAME } })) clashes.push(`a business named "${BUSINESS_NAME}"`);
    if (await prisma.user.findUnique({ where: { email: OWNER_EMAIL } })) clashes.push(`a user with email ${OWNER_EMAIL}`);
    const taken = await prisma.globalCustomer.count({ where: { normalizedPhone: { in: CUSTOMERS.map((_, index) => phoneFor(index)) } } });
    if (taken) clashes.push(`${taken} of the demo phone numbers`);
    if (clashes.length) throw new Error(`Stopped - this database already has ${clashes.join(", ")}. Nothing was changed.`);

    // Images go up only on a real run, and before the database write, so the
    // records never point at a file that is not there.
    const logoUrl = NO_IMAGES ? null : WRITE ? await uploadPng(logo, "logos") : "https://example.invalid/logos/dry-run.png";

    const password = `Demo-${randomBytes(6).toString("base64url")}`;
    const passwordHash = await bcrypt.hash(password, 12);

    const summary = await prisma
      .$transaction(
        async (tx) => {
          const plan =
            (await tx.subscriptionPlan.findUnique({ where: { code: "GROWTH" } })) ??
            (await tx.subscriptionPlan.create({
              data: { code: "GROWTH", name: "Growth", maxBranches: 3, maxLoyaltyPrograms: 5, monthlyPrice: "200.00", annualPrice: "2000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
            }));

          const business = await tx.business.create({ data: { name: BUSINESS_NAME, businessType: "OTHER", status: "ACTIVE" } });
          await tx.businessBranding.create({ data: { businessId: business.id, logoUrl, ...BRANDING } });
          await tx.customerTierSetting.create({
            data: {
              businessId: business.id,
              criteria: "VISITS_ONLY",
              tierQualificationWindow: "DAYS_90",
              tierMaintenanceMode: "DYNAMIC",
              silverVisitRequirement: 3,
              goldVisitRequirement: 6,
              vipVisitRequirement: 10,
            },
          });
          await tx.businessScannerSettings.create({ data: { businessId: business.id, soundEffectsEnabled: true } });
          await tx.businessCommunicationSettings.create({
            data: { businessId: business.id, whatsappEnabled: false, smsEnabled: false, emailEnabled: false, preferredDefaultChannel: "NONE" },
          });
          await tx.abusePolicy.createMany({
            data: ALERT_POLICIES.map(([ruleType, policyName, thresholdValue, severity]) => ({
              businessId: business.id,
              ruleType,
              policyName,
              thresholdValue,
              severity,
              enabled: true,
              dedupeWindowHours: 24,
            })),
          });

          const branch = await tx.branch.create({
            data: { businessId: business.id, name: "Cairo Store", country: "Egypt", city: "Cairo", address: "Era Care Store, Cairo", status: "ACTIVE" },
          });

          const owner = await tx.user.create({
            data: {
              name: "Era Care Manager",
              email: OWNER_EMAIL,
              role: "BUSINESS_OWNER",
              passwordHash,
              businessId: business.id,
              branchId: branch.id,
              status: "ACTIVE",
              forcePasswordChange: false,
            },
          });

          await tx.businessSubscription.create({
            data: {
              businessId: business.id,
              subscriptionPlanId: plan.id,
              status: "ACTIVE",
              billingCycle: "YEARLY",
              startDate: daysAgo(90),
              expiryDate: daysAgo(-275),
              renewalDate: daysAgo(-275),
            },
          });

          const program = await tx.loyaltyProgram.create({
            data: {
              businessId: business.id,
              businessType: "OTHER",
              name: "Era Care Rewards",
              productOrServiceName: "Skincare & cosmetics",
              description: `Collect a stamp with every purchase. A ${REWARDS.milestone.rewardName.toLowerCase()} at ${MILESTONE_AT} purchases and a ${REWARDS.full.rewardName.toLowerCase()} at ${REQUIRED_STAMPS}.`,
              requiredStamps: REQUIRED_STAMPS,
              startingBonusStamps: 0,
              startingStampPolicy: "NEVER",
              referralRewardBonusStamps: 1,
              cardTheme: "BUSINESS_DEFAULT",
              cardDesign: cardDesignFor(),
              stampEmoji: "\u2728",
              walletHeroStyle: "STAMPS",
              rewardName: REWARDS.full.rewardName,
              rewardDescription: REWARDS.full.rewardDescription,
              active: true,
            },
          });
          // The business's one referral reward: a free visit stamp on this card.
          if (tx.businessReferralSettings) {
            await tx.businessReferralSettings.create({ data: { businessId: business.id, rewardType: "STAMPS", stampProgramId: program.id, referrerStamps: 1, friendStamps: 0 } });
          }
          const milestoneReward = await tx.programReward.create({ data: { loyaltyProgramId: program.id, ...REWARDS.milestone, completesCard: false } });
          const fullReward = await tx.programReward.create({ data: { loyaltyProgramId: program.id, ...REWARDS.full, completesCard: true } });
          const rewardRow = { milestone: milestoneReward, full: fullReward };

          const stamps = [];
          const redemptions = [];
          for (const [index, customer] of CUSTOMERS.entries()) {
            const phone = phoneFor(index);
            const joinedAt = daysAgo(customer.joined);
            const state = cardStateFor(customer);

            const globalCustomer = await tx.globalCustomer.create({
              data: { firstName: customer.firstName, lastName: customer.lastName, phone, normalizedPhone: phone },
            });
            const membership = await tx.businessCustomerMembership.create({
              data: {
                globalCustomerId: globalCustomer.id,
                businessId: business.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone,
                normalizedPhone: phone,
                createdBranchId: branch.id,
                createdByUserId: owner.id,
                marketingConsent: true,
                source: "OWNER",
                status: "ACTIVE",
                cardToken: token("cst"),
                cardStatus: "ACTIVE",
                referralCode: `ERA-${String(index + 1).padStart(3, "0")}`,
                referralEnabled: true,
                currentTier: customer.tier,
                tierUpdatedAt: new Date(),
                joinedAt,
                notes: "Demo customer.",
              },
            });
            const programMembership = await tx.customerProgramMembership.create({
              data: {
                businessCustomerMembershipId: membership.id,
                loyaltyProgramId: program.id,
                earnedStamps: state.earnedStamps,
                bonusStamps: 0,
                claimedRewardStamps: state.claimed,
                enrollmentSource: "OWNER",
                status: "ACTIVE",
                scanToken: token("scan"),
                scanStatus: "ACTIVE",
                enrolledAt: joinedAt,
              },
            });

            // One purchase stamp per visit, spread from joining until today.
            const visitDate = (visit) => daysAgo(Math.max(0.5, customer.joined * (1 - (visit + 1) / (customer.visits + 1))));
            for (let visit = 0; visit < customer.visits; visit += 1) {
              stamps.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                issuedByUserId: owner.id,
                quantity: 1,
                reason: "Purchase",
                source: "QR_SCAN",
                idempotencyKey: `eracare-demo-${programMembership.uuid}-${visit + 1}`,
                createdAt: visitDate(visit),
              });
            }
            // Rewards they already collected, dated at the visit that earned them.
            for (const kind of state.redemptions) {
              const reward = rewardRow[kind];
              redemptions.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                loyaltyProgramId: program.id,
                programRewardId: reward.id,
                rewardName: reward.rewardName,
                requiredStamps: reward.atStamp,
                redeemedByUserId: owner.id,
                redeemedAt: visitDate(reward.atStamp - 1),
                idempotencyKey: `eracare-demo-redeem-${programMembership.uuid}-${kind}`,
              });
            }
          }
          await tx.stampTransaction.createMany({ data: stamps });
          if (redemptions.length) await tx.rewardRedemption.createMany({ data: redemptions });

          const result = { branch: branch.name, customers: CUSTOMERS.length, stamps: stamps.length, redemptions: redemptions.length };
          if (!WRITE) throw Object.assign(new DryRunRollback("dry run"), { result });
          return result;
        },
        { timeout: 120_000, maxWait: 20_000 },
      )
      .catch((error) => {
        if (error instanceof DryRunRollback) return { ...error.result, dryRun: true };
        throw error;
      });

    console.log(summary.dryRun ? "DRY RUN OK - everything checked, nothing saved." : "SAVED.");
    console.log(`Business  : ${BUSINESS_NAME} (branch: ${summary.branch})`);
    console.log(`Program   : Era Care Rewards - ${REQUIRED_STAMPS} purchases (free lip balm at ${MILESTONE_AT}, free skincare product at ${REQUIRED_STAMPS})`);
    console.log(`Customers : ${summary.customers}   Stamps: ${summary.stamps}   Rewards redeemed: ${summary.redemptions}`);
    if (!summary.dryRun) {
      console.log("");
      console.log("Demo login (shown only once - write it down):");
      console.log(`  Email:    ${OWNER_EMAIL}`);
      console.log(`  Password: ${password}`);
      if (NO_IMAGES) {
        console.log("");
        console.log("Next, log in as the demo and upload the logo from scripts/db/demo-assets/eracare/:");
        console.log("  Settings > Brand Assets > Change Logo -> logo.png, then Save Brand Assets");
      }
    } else {
      console.log("");
      console.log("Nothing was written. To create the demo, run the same command with --yes.");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("");
  console.error(error.message ?? error);
  process.exitCode = 1;
});
