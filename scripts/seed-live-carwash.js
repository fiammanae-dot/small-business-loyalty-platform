/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds ONE test business to the LIVE database so Google Wallet (and the Wallet
 * message broadcast) can be tried on the real site:
 *
 *   Sparkle Car Wash Center - 1 branch, 1 owner login, 2 programs,
 *   50 customers spread across every stamp stage, each with a car plate.
 *
 * Additive only: it never deletes or edits existing rows, and it refuses to
 * run if the business, the owner email or any of its test phone numbers
 * already exist. Everything is written in ONE transaction, so it either all
 * lands or nothing does.
 *
 * Target: PRODUCTION_DATABASE_URL from .env (override with SEED_DATABASE_URL).
 *
 *   node scripts/seed-live-carwash.js            -> dry run: checks everything, writes nothing
 *   node scripts/seed-live-carwash.js --yes      -> writes the data
 */
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const nextEnv = require("@next/env");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

nextEnv.loadEnvConfig(process.cwd());

const WRITE = process.argv.includes("--yes");
const DATABASE_URL = process.env.SEED_DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;
const BUSINESS_NAME = "Sparkle Car Wash Center";
const OWNER_EMAIL = (process.env.SEED_OWNER_EMAIL || "owner@sparkle-carwash.test").toLowerCase();
const CUSTOMER_COUNT = 50;
// A clearly fake block of UAE mobile numbers: +971 50 999 0001 ... 0050.
const phoneFor = (index) => `+97150999${String(index + 1).padStart(4, "0")}`;

class DryRunRollback extends Error {}

const PROGRAMS = [
  {
    key: "wash",
    name: "Wash Club",
    productOrServiceName: "Car Wash",
    description: "Collect a stamp every wash.",
    requiredStamps: 10,
    rewardName: "Free Exterior Wash",
    rewardDescription: "Your 11th exterior wash is on us.",
    stampEmoji: "🚗",
    cardDesign: design("PREMIUM", "CAR"),
  },
  {
    key: "detail",
    name: "Premium Detail Club",
    productOrServiceName: "Full Detail",
    description: "Collect a stamp every full detail.",
    requiredStamps: 6,
    rewardName: "Free Interior Detail",
    rewardDescription: "Your 7th interior detail is free.",
    stampEmoji: "🪣",
    cardDesign: design("MODERN", "WATER_DROP"),
  },
];

const FIRST_NAMES = [
  "Ahmed", "Fatima", "Mohammed", "Aisha", "Omar", "Mariam", "Khalid", "Noura", "Yousef", "Layla",
  "Hamdan", "Sara", "Rashid", "Huda", "Saeed", "Reem", "Sultan", "Maitha", "Ali", "Shamma",
  "Faisal", "Latifa", "Majid", "Hessa", "Tariq", "Amna", "Zayed", "Mona", "Nasser", "Alya",
  "Hassan", "Dana", "Ibrahim", "Noor", "Karim", "Salma", "Adel", "Rania", "Walid", "Lina",
  "Rami", "Yasmin", "Samir", "Hind", "Bilal", "Farah", "Jamal", "Nadia", "Hamad", "Asma",
];
const LAST_NAMES = ["Al Mansoori", "Al Nuaimi", "Al Suwaidi", "Al Ketbi", "Al Hashimi", "Al Marri", "Al Falasi", "Al Shamsi", "Haddad", "Khoury"];
const CARS = [
  ["Toyota", "Land Cruiser", "LARGE_SUV"], ["Nissan", "Patrol", "LARGE_SUV"], ["Lexus", "LX 600", "LARGE_SUV"],
  ["Toyota", "Camry", "SEDAN"], ["Nissan", "Altima", "SEDAN"], ["Mercedes-Benz", "C 200", "SEDAN"],
  ["BMW", "X5", "SUV"], ["Kia", "Sportage", "SUV"], ["Hyundai", "Tucson", "SUV"],
  ["Ford", "F-150", "PICKUP"], ["Mitsubishi", "Attrage", "SMALL_CAR"], ["Toyota", "Hiace", "VAN"],
];
const COLOURS = ["WHITE", "BLACK", "SILVER", "GREY", "BLUE", "RED", "BEIGE"];
const EMIRATES = [["DUBAI", "A"], ["DUBAI", "N"], ["SHARJAH", "3"], ["ABU_DHABI", "1"], ["AJMAN", "B"]];

function design(layoutStyle, stampIcon) {
  return {
    version: "v1",
    layoutStyle,
    cardStyle: layoutStyle === "MODERN" ? "modern-clean" : "premium-dark",
    stampJourneyStyle: layoutStyle === "MODERN" ? "PROGRESS_BAR" : "CIRCLES",
    stampIcon,
    progressStyle: "linear",
    typographyPreset: "MODERN",
    backgroundStyle: "PATTERN",
    backgroundPattern: "WATER_BUBBLES",
    decorationStyle: "SOFT",
    rewardStyle: "FILLED",
    footerStyle: "scan-cta",
    animationStyle: "subtle",
    templateId: `carwash-${layoutStyle.toLowerCase()}`,
    visibleSections: { logo: true, businessName: true, customerName: true, tierBadge: true, rewardBox: true, progress: true, qr: true, footer: true, referral: true, visits: true, programName: true },
  };
}

const token = (prefix) => `${prefix}_${randomBytes(14).toString("base64url")}`;
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Stages. Wash Club (10 stamps): everyone, cycling 0..10 so every stage has
 * customers, 10 = reward ready. Two customers already redeemed once.
 * Premium Detail (6 stamps): every second customer, cycling 0..6.
 */
function planCustomer(index) {
  const redeemedBefore = index === 11 || index === 33;
  const wash = { progress: redeemedBefore ? 2 : index % 11, redemptions: redeemedBefore ? 1 : 0 };
  const detail = index % 2 === 0 ? { progress: Math.floor(index / 2) % 7, redemptions: 0 } : null;
  const totalVisits = wash.progress + wash.redemptions * 10 + (detail ? detail.progress : 0);
  const tier = totalVisits >= 30 ? "VIP" : totalVisits >= 15 ? "GOLD" : totalVisits >= 5 ? "SILVER" : "BRONZE";
  const [brand, model, size] = CARS[index % CARS.length];
  const [emirate, code] = EMIRATES[index % EMIRATES.length];
  const number = String(10000 + ((index * 7919) % 89999));
  return {
    firstName: FIRST_NAMES[index % FIRST_NAMES.length],
    lastName: LAST_NAMES[index % LAST_NAMES.length],
    phone: phoneFor(index),
    wash,
    detail,
    tier,
    joinedDaysAgo: 3 + ((index * 13) % 80),
    vehicle: { emirate, code, number, brand, model, size, colour: COLOURS[index % COLOURS.length], normalized: `${emirate}-${code}-${number}` },
  };
}

function mask(url) {
  const parsed = new URL(url);
  return `${parsed.hostname}/${parsed.pathname.replace(/^\//, "")}`;
}

async function main() {
  if (!DATABASE_URL) throw new Error("PRODUCTION_DATABASE_URL (or SEED_DATABASE_URL) is not set in .env.");
  console.log(`Target database: ${mask(DATABASE_URL)}`);
  console.log(WRITE ? "Mode: WRITE" : "Mode: DRY RUN (nothing will be saved; add --yes to save)");

  const pool = new Pool({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const before = {
      businesses: await prisma.business.count(),
      customers: await prisma.businessCustomerMembership.count(),
      users: await prisma.user.count(),
    };
    console.log("Currently in this database:", before);

    const clashes = [];
    if (await prisma.business.findFirst({ where: { name: BUSINESS_NAME } })) clashes.push(`a business named "${BUSINESS_NAME}"`);
    if (await prisma.user.findUnique({ where: { email: OWNER_EMAIL } })) clashes.push(`a user with email ${OWNER_EMAIL}`);
    const phones = Array.from({ length: CUSTOMER_COUNT }, (_, i) => phoneFor(i));
    const takenPhones = await prisma.globalCustomer.count({ where: { normalizedPhone: { in: phones } } });
    if (takenPhones) clashes.push(`${takenPhones} of the test phone numbers`);
    if (clashes.length) throw new Error(`Stopped - this database already has ${clashes.join(", ")}. Nothing was changed.`);

    const password = `Wash-${randomBytes(6).toString("base64url")}`;
    const passwordHash = await bcrypt.hash(password, 12);

    const summary = await prisma.$transaction(
      async (tx) => {
        const plan =
          (await tx.subscriptionPlan.findUnique({ where: { code: "GROWTH" } })) ??
          (await tx.subscriptionPlan.create({
            data: { code: "GROWTH", name: "Growth", maxBranches: 3, maxLoyaltyPrograms: 5, monthlyPrice: "200.00", annualPrice: "2000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
          }));

        const business = await tx.business.create({ data: { name: BUSINESS_NAME, businessType: "CAR_CARE_CENTER", status: "ACTIVE" } });
        await tx.businessBranding.create({ data: { businessId: business.id, primaryColor: "#0369A1", secondaryColor: "#FFFFFF", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#0369A1" } });
        await tx.customerTierSetting.create({ data: { businessId: business.id, criteria: "VISITS_ONLY", tierQualificationWindow: "DAYS_90", tierMaintenanceMode: "DYNAMIC", silverVisitRequirement: 5, goldVisitRequirement: 15, vipVisitRequirement: 30 } });
        await tx.businessScannerSettings.create({ data: { businessId: business.id, soundEffectsEnabled: true } });
        await tx.businessCommunicationSettings.create({ data: { businessId: business.id, whatsappEnabled: false, smsEnabled: false, emailEnabled: false, preferredDefaultChannel: "NONE" } });
        const branch = await tx.branch.create({ data: { businessId: business.id, name: "Al Quoz Main Bay", country: "United Arab Emirates", city: "Dubai", address: "Al Quoz Industrial Area 3", status: "ACTIVE" } });
        const owner = await tx.user.create({
          data: { name: "Sparkle Car Wash Owner", email: OWNER_EMAIL, role: "BUSINESS_OWNER", passwordHash, businessId: business.id, branchId: branch.id, status: "ACTIVE", forcePasswordChange: false },
        });
        await tx.businessSubscription.create({
          data: { businessId: business.id, subscriptionPlanId: plan.id, status: "ACTIVE", billingCycle: "YEARLY", startDate: daysAgo(30), expiryDate: daysAgo(-335), renewalDate: daysAgo(-335) },
        });

        const programs = {};
        for (const { key, ...program } of PROGRAMS) {
          programs[key] = await tx.loyaltyProgram.create({
            data: { businessId: business.id, businessType: "CAR_CARE_CENTER", cardTheme: "AUTOMOTIVE", startingBonusStamps: 0, startingStampPolicy: "NEVER", referralRewardBonusStamps: 1, active: true, ...program },
          });
        }

        const stamps = [];
        const redemptions = [];
        const stageCount = { wash: {}, detail: {} };

        for (let index = 0; index < CUSTOMER_COUNT; index += 1) {
          const c = planCustomer(index);
          const joinedAt = daysAgo(c.joinedDaysAgo);
          const globalCustomer = await tx.globalCustomer.create({ data: { firstName: c.firstName, lastName: c.lastName, phone: c.phone, normalizedPhone: c.phone } });
          const membership = await tx.businessCustomerMembership.create({
            data: {
              globalCustomerId: globalCustomer.id,
              businessId: business.id,
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
              normalizedPhone: c.phone,
              createdBranchId: branch.id,
              createdByUserId: owner.id,
              marketingConsent: true,
              source: "OWNER",
              status: "ACTIVE",
              cardToken: token("cst"),
              cardStatus: "ACTIVE",
              referralCode: `SPRK-${String(index + 1).padStart(3, "0")}`,
              referralEnabled: true,
              currentTier: c.tier,
              tierUpdatedAt: new Date(),
              joinedAt,
              notes: "Test customer for Google Wallet testing.",
              vehicleEmirate: c.vehicle.emirate,
              vehicleCode: c.vehicle.code,
              vehicleNumber: c.vehicle.number,
              normalizedPlate: c.vehicle.normalized,
              vehicleBrand: c.vehicle.brand,
              vehicleModel: c.vehicle.model,
              vehicleColour: c.vehicle.colour,
              vehicleSize: c.vehicle.size,
            },
          });

          for (const [key, state] of [["wash", c.wash], ["detail", c.detail]]) {
            if (!state) continue;
            const program = programs[key];
            const programMembership = await tx.customerProgramMembership.create({
              data: {
                businessCustomerMembershipId: membership.id,
                loyaltyProgramId: program.id,
                earnedStamps: state.progress,
                bonusStamps: 0,
                enrollmentSource: "OWNER",
                status: "ACTIVE",
                scanToken: token("scan"),
                scanStatus: "ACTIVE",
                enrolledAt: joinedAt,
              },
            });
            stageCount[key][state.progress] = (stageCount[key][state.progress] ?? 0) + 1;

            const history = state.progress + state.redemptions * program.requiredStamps;
            for (let s = 0; s < history; s += 1) {
              stamps.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                issuedByUserId: owner.id,
                quantity: 1,
                reason: "Visit",
                source: "QR_SCAN",
                idempotencyKey: `sparkle-seed-${programMembership.uuid}-${s + 1}`,
                // Spread visits between joining and today, oldest first.
                createdAt: daysAgo(Math.max(0.5, c.joinedDaysAgo * (1 - (s + 1) / (history + 1)))),
              });
            }
            for (let r = 0; r < state.redemptions; r += 1) {
              redemptions.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                loyaltyProgramId: program.id,
                rewardName: program.rewardName,
                requiredStamps: program.requiredStamps,
                redeemedByUserId: owner.id,
                redeemedAt: daysAgo(Math.max(1, Math.floor(c.joinedDaysAgo / 2))),
                idempotencyKey: `sparkle-seed-${programMembership.uuid}-redeem-${r + 1}`,
                notes: "Test redemption.",
              });
            }
          }
        }

        await tx.stampTransaction.createMany({ data: stamps });
        if (redemptions.length) await tx.rewardRedemption.createMany({ data: redemptions });

        const result = { business, branch, owner, programs, stamps: stamps.length, redemptions: redemptions.length, stageCount };
        if (!WRITE) throw Object.assign(new DryRunRollback("dry run"), { result });
        return result;
      },
      { timeout: 170_000, maxWait: 20_000 },
    ).catch((error) => {
      if (error instanceof DryRunRollback) return { ...error.result, dryRun: true };
      throw error;
    });

    console.log("");
    console.log(summary.dryRun ? "DRY RUN OK - everything checked, nothing saved." : "SAVED.");
    console.log(`Business: ${BUSINESS_NAME} (branch: ${summary.branch.name})`);
    console.log(`Programs: Wash Club (10 stamps), Premium Detail Club (6 stamps)`);
    console.log(`Customers: ${CUSTOMER_COUNT}   Stamps: ${summary.stamps}   Past rewards redeemed: ${summary.redemptions}`);
    console.log("Customers per stage - Wash Club:", summary.stageCount.wash);
    console.log("Customers per stage - Premium Detail:", summary.stageCount.detail);
    if (!summary.dryRun) {
      console.log("");
      console.log("Owner login for the live site (write this down, it is shown only once):");
      console.log(`  Email:    ${OWNER_EMAIL}`);
      console.log(`  Password: ${password}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
