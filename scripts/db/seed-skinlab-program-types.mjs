/**
 * Top up The Skin Lab Demo so every PROGRAM TYPE is represented and can be
 * inspected in the wallet: a stamp card, three memberships, a cashback balance
 * (already enabled) and visit-tiers. Additive and idempotent - it only creates
 * what's missing (by program name / customer phone) and never edits or deletes
 * existing rows. Run the dry run first to see exactly what it will do.
 *
 *   node scripts/db/seed-skinlab-program-types.mjs                                  -> dry run on the demo/dev DB
 *   node scripts/db/seed-skinlab-program-types.mjs --yes                            -> write to the demo/dev DB
 *   node scripts/db/seed-skinlab-program-types.mjs --production --name="The Skin Lab Demo"        -> dry run against PRODUCTION
 *   node scripts/db/seed-skinlab-program-types.mjs --production --yes --name="The Skin Lab Demo"  -> write to PRODUCTION
 */
import { randomBytes } from "node:crypto";
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
const nameArg = process.argv.find((a) => a.startsWith("--name="));
const BUSINESS_NAME = nameArg ? nameArg.slice(7) : "The Skin Lab Demo";

const SESSIONS = 6;
const token = (p) => `${p}_${randomBytes(14).toString("base64url")}`;
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const host = (url) => new URL(url).hostname;

// Visit thresholds kept low so the sample customers clearly land on Silver/Gold.
const TIERS = { silver: 2, gold: 4, vip: 8, window: "DAYS_90", mode: "DYNAMIC" };

const STAMP_PROGRAM = {
  name: "Skin Lab Visit Rewards",
  productOrServiceName: "Facial Treatment",
  description: "Collect a stamp on every visit and unlock a complimentary express facial.",
  requiredStamps: 8,
  rewardName: "Free express facial",
  rewardDescription: "Enjoy a complimentary express facial once the card is full.",
  stampEmoji: "✨",
};

// Pool of memberships; we top the business up to three total from here.
const MEMBERSHIP_POOL = [
  {
    name: "White Lily Membership",
    price: "3000.00",
    description: "A gentle rejuvenation membership for consistent skin maintenance, hydration and self-care.",
    treatments: ["Hydrafacial", "Organic Facial", "Forma Skin Tightening", "OxyGeneo Facial", "Full Body Laser Hair Reduction"],
    benefits: ["Priority booking", "Exclusive member pricing on additional treatments", "Complimentary skin consultation & analysis"],
  },
  {
    name: "Golden Tulip Membership",
    price: "6000.00",
    description: "An advanced rejuvenation membership focused on skin quality, prevention and collagen stimulation.",
    treatments: ["TSL Dermapen", "Hydro Oxy Facial", "Prophilo Skin Booster", "Botox Nabota Upper face", "Lip Booster ( Shine )"],
    benefits: ["Priority booking", "Exclusive member-only pricing", "Personalized treatment planning"],
  },
  {
    name: "Royal Rose Membership",
    price: "12000.00",
    description: "Our most exclusive membership for complete face, skin and hair renewal through advanced treatments.",
    treatments: ["RRS Trio Box", "Botox Dysport", "RRS U-Shape", "1 ML Filler", "Sculptra", "Morpheus Face + Salmon DNA"],
    benefits: ["VIP priority booking", "Personalized yearly treatment plan", "Luxury member gifting experience"],
  },
];

// Two sample customers enrolled per NEW program, with a tier that sticks (backed
// by matching visits) and a cashback balance, so each card looks populated.
const SAMPLES = [
  { firstName: "Maha", lastName: "Al Rashedi", tier: "SILVER", visits: 3, cashback: "75.00" },
  { firstName: "Noor", lastName: "Al Habtoor", tier: "GOLD", visits: 5, cashback: "150.00" },
];

class DryRunRollback extends Error {}

if (!DATABASE_URL) {
  console.error(ALLOW_PRODUCTION ? "PRODUCTION_DATABASE_URL is not in .env." : "No SEED_DEMO_DATABASE_URL or DATABASE_URL set.");
  process.exit(1);
}
if (!ALLOW_PRODUCTION && process.env.PRODUCTION_DATABASE_URL && host(DATABASE_URL) === host(process.env.PRODUCTION_DATABASE_URL)) {
  console.error("Refusing to run against the PRODUCTION database without --production.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function visitRows({ businessId, branchId, userId, programMembershipId, uuid, count, treatment }) {
  const rows = [];
  for (let v = 0; v < count; v += 1) {
    rows.push({
      businessId,
      branchId,
      customerProgramMembershipId: programMembershipId,
      issuedByUserId: userId,
      quantity: 1,
      reason: "Demo visit",
      treatmentName: treatment ?? null,
      source: "QR_SCAN",
      idempotencyKey: `skinlab-types-${uuid}-${v + 1}`,
      createdAt: daysAgo(Math.max(1, 30 - v * 5)),
    });
  }
  return rows;
}

try {
  const business = await prisma.business.findFirst({ where: { name: BUSINESS_NAME } });
  if (!business) {
    console.error(`No business named "${BUSINESS_NAME}" in this database.`);
    process.exit(1);
  }
  const branch = await prisma.branch.findFirst({ where: { businessId: business.id }, orderBy: { id: "asc" } });
  const owner =
    (await prisma.user.findFirst({ where: { businessId: business.id, role: "BUSINESS_OWNER" }, orderBy: { id: "asc" } })) ??
    (await prisma.user.findFirst({ where: { businessId: business.id }, orderBy: { id: "asc" } }));
  if (!branch || !owner) {
    console.error("Business has no branch or no user to attribute records to.");
    process.exit(1);
  }

  const existing = await prisma.loyaltyProgram.findMany({ where: { businessId: business.id }, select: { name: true, isMembership: true } });
  const existingNames = new Set(existing.map((p) => p.name));
  const stampCount = existing.filter((p) => !p.isMembership).length;
  const membershipCount = existing.filter((p) => p.isMembership).length;

  const needStamp = stampCount === 0 && !existingNames.has(STAMP_PROGRAM.name);
  const membershipsToCreate = [];
  for (const pkg of MEMBERSHIP_POOL) {
    if (membershipCount + membershipsToCreate.length >= 3) break;
    if (!existingNames.has(pkg.name)) membershipsToCreate.push(pkg);
  }

  console.log(`DB host      : ${host(DATABASE_URL)}${ALLOW_PRODUCTION ? " (PRODUCTION)" : ""}`);
  console.log(`Business     : ${business.name} (id ${business.id}, ${business.businessType})`);
  console.log(`Existing     : ${stampCount} stamp program(s), ${membershipCount} membership(s) -> [${existing.map((p) => p.name).join(", ") || "none"}]`);
  console.log(`Will create  : ${needStamp ? "1 stamp program" : "no stamp program (already present)"}; memberships: [${membershipsToCreate.map((p) => p.name).join(", ") || "none needed"}]`);
  console.log(`Tier config  : Silver ${TIERS.silver} / Gold ${TIERS.gold} / VIP ${TIERS.vip} visits (upsert)`);
  console.log(`Sample custs : ${SAMPLES.length} per NEW program, tiers ${SAMPLES.map((s) => s.tier).join("/")}, with cashback`);
  console.log("");

  const summary = await prisma
    .$transaction(
      async (tx) => {
        const newPrograms = [];

        if (needStamp) {
          const sp = await tx.loyaltyProgram.create({
            data: {
              businessId: business.id,
              businessType: business.businessType,
              name: STAMP_PROGRAM.name,
              productOrServiceName: STAMP_PROGRAM.productOrServiceName,
              description: STAMP_PROGRAM.description,
              requiredStamps: STAMP_PROGRAM.requiredStamps,
              isMembership: false,
              startingBonusStamps: 0,
              startingStampPolicy: "FIRST_ENROLLMENT_ONLY",
              referralRewardBonusStamps: 1,
              cardTheme: "BUSINESS_DEFAULT",
              stampEmoji: STAMP_PROGRAM.stampEmoji,
              rewardName: STAMP_PROGRAM.rewardName,
              rewardDescription: STAMP_PROGRAM.rewardDescription,
              active: true,
            },
          });
          await tx.programReward.create({
            data: { loyaltyProgramId: sp.id, atStamp: STAMP_PROGRAM.requiredStamps, rewardName: STAMP_PROGRAM.rewardName, rewardDescription: STAMP_PROGRAM.rewardDescription, completesCard: true },
          });
          newPrograms.push({ program: sp, required: STAMP_PROGRAM.requiredStamps, treatment: STAMP_PROGRAM.productOrServiceName, isMembership: false });
        }

        for (const pkg of membershipsToCreate) {
          const mp = await tx.loyaltyProgram.create({
            data: {
              businessId: business.id,
              businessType: business.businessType,
              name: pkg.name,
              productOrServiceName: "Aesthetic Treatments",
              description: pkg.description,
              requiredStamps: SESSIONS,
              isMembership: true,
              priceAmount: pkg.price,
              membershipBenefits: pkg.benefits,
              startingBonusStamps: 0,
              startingStampPolicy: "NEVER",
              referralRewardBonusStamps: 1,
              cardTheme: "BUSINESS_DEFAULT",
              stampEmoji: "✨",
              rewardName: "Membership complete",
              rewardDescription: "All prepaid sessions used.",
              active: true,
            },
          });
          await tx.membershipTreatment.createMany({ data: pkg.treatments.map((name, order) => ({ loyaltyProgramId: mp.id, name, sortOrder: order, active: true })) });
          await tx.programReward.create({ data: { loyaltyProgramId: mp.id, atStamp: SESSIONS, rewardName: "Membership complete", rewardDescription: "All prepaid sessions used.", completesCard: true } });
          newPrograms.push({ program: mp, required: SESSIONS, treatment: pkg.treatments[0], isMembership: true });
        }

        // Business-wide tier ladder (upsert - safe if it already exists).
        await tx.customerTierSetting.upsert({
          where: { businessId: business.id },
          create: { businessId: business.id, criteria: "VISITS_ONLY", tierQualificationWindow: TIERS.window, tierMaintenanceMode: TIERS.mode, silverVisitRequirement: TIERS.silver, goldVisitRequirement: TIERS.gold, vipVisitRequirement: TIERS.vip },
          update: { silverVisitRequirement: TIERS.silver, goldVisitRequirement: TIERS.gold, vipVisitRequirement: TIERS.vip },
        });

        let customersCreated = 0;
        let visitsCreated = 0;
        let seq = 0;
        for (const entry of newPrograms) {
          for (const sample of SAMPLES) {
            seq += 1;
            const phone = `+9715${String(900000 + business.id * 100 + seq).slice(-8)}`;
            const already = await tx.businessCustomerMembership.findFirst({ where: { businessId: business.id, normalizedPhone: phone } });
            if (already) continue;

            const used = Math.min(sample.visits, entry.required - 1); // leave at least one left on memberships
            const gc = await tx.globalCustomer.create({ data: { firstName: sample.firstName, lastName: sample.lastName, phone, normalizedPhone: phone } });
            const bcm = await tx.businessCustomerMembership.create({
              data: {
                globalCustomerId: gc.id,
                businessId: business.id,
                firstName: sample.firstName,
                lastName: sample.lastName,
                phone,
                normalizedPhone: phone,
                createdBranchId: branch.id,
                createdByUserId: owner.id,
                marketingConsent: true,
                source: "OWNER",
                status: "ACTIVE",
                cardToken: token("cst"),
                cardStatus: "ACTIVE",
                referralCode: `TSLX-${String(seq).padStart(3, "0")}`,
                referralEnabled: true,
                currentTier: sample.tier,
                tierUpdatedAt: new Date(),
                cashbackBalance: sample.cashback,
                joinedAt: daysAgo(40),
                notes: "Program-types demo customer.",
              },
            });
            const pm = await tx.customerProgramMembership.create({
              data: {
                businessCustomerMembershipId: bcm.id,
                loyaltyProgramId: entry.program.id,
                earnedStamps: used,
                bonusStamps: 0,
                sessionsForfeited: 0,
                forfeitCyclesProcessed: 0,
                enrollmentSource: "OWNER",
                status: "ACTIVE",
                scanToken: token("scan"),
                scanStatus: "ACTIVE",
                enrolledAt: daysAgo(40),
              },
            });
            const rows = visitRows({ businessId: business.id, branchId: branch.id, userId: owner.id, programMembershipId: pm.id, uuid: pm.uuid, count: used, treatment: entry.treatment });
            if (rows.length) await tx.stampTransaction.createMany({ data: rows });
            customersCreated += 1;
            visitsCreated += rows.length;
          }
        }

        const result = { programs: newPrograms.map((p) => p.program.name), customersCreated, visitsCreated };
        if (!WRITE) throw Object.assign(new DryRunRollback("dry run"), { result });
        return result;
      },
      { timeout: 170_000, maxWait: 20_000 },
    )
    .catch((error) => {
      if (error instanceof DryRunRollback) return { ...error.result, dryRun: true };
      throw error;
    });

  console.log(summary.dryRun ? "DRY RUN OK - nothing written." : "SAVED.");
  console.log(`New programs : [${summary.programs.join(", ") || "none"}]`);
  console.log(`Customers    : ${summary.customersCreated} created, ${summary.visitsCreated} visits recorded`);
  if (summary.dryRun) {
    console.log("");
    console.log("To apply, re-run with --yes" + (ALLOW_PRODUCTION ? " --production --name=\"" + BUSINESS_NAME + "\"" : "") + ".");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
