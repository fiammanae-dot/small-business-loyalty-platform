/**
 * Builds a ready-made laser clinic for showing the platform to a prospect.
 *
 *   Lumiere Laser & Skin - 1 branch, 1 owner login, a 6-session package with a
 *   reward halfway through, and 8 customers spread across every stage so the
 *   dashboard looks like a working clinic rather than an empty shell.
 *
 * TARGET: the DEMO database, never production. The whole point of a demo
 * account is that it leaves no trace in the real numbers, so this script
 * refuses to run against PRODUCTION_DATABASE_URL and says so.
 *
 * Additive only: it never edits or deletes existing rows, refuses to run if
 * the clinic is already there, and writes everything in ONE transaction, so it
 * either all lands or nothing does.
 *
 *   node scripts/db/seed-demo-clinic.mjs          -> dry run: checks everything, writes nothing
 *   node scripts/db/seed-demo-clinic.mjs --yes    -> writes the data
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const WRITE = process.argv.includes("--yes");
const DATABASE_URL = process.env.SEED_DEMO_DATABASE_URL || process.env.DATABASE_URL;
const BUSINESS_NAME = "Lumiere Laser & Skin";
const OWNER_EMAIL = (process.env.SEED_DEMO_OWNER_EMAIL || "owner@lumiere-demo.test").toLowerCase();
const REQUIRED_SESSIONS = 6;
const MILESTONE_AT = 3;

class DryRunRollback extends Error {}

const token = (prefix) => `${prefix}_${randomBytes(14).toString("base64url")}`;
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const host = (url) => new URL(url).hostname;

/**
 * Eight customers, chosen so every screen a prospect might click has something
 * real in it: someone who just started, someone at the halfway reward, someone
 * finished and waiting to collect, and someone already on their second package.
 */
const CUSTOMERS = [
  { firstName: "Noura", lastName: "Al Mansoori", progress: 1, completed: 0, joined: 12, tier: "BRONZE" },
  { firstName: "Aisha", lastName: "Al Suwaidi", progress: 2, completed: 0, joined: 28, tier: "BRONZE" },
  { firstName: "Reem", lastName: "Al Hashimi", progress: MILESTONE_AT, completed: 0, joined: 54, tier: "SILVER" },
  { firstName: "Fatima", lastName: "Khoury", progress: MILESTONE_AT, completed: 0, joined: 61, tier: "SILVER" },
  { firstName: "Layla", lastName: "Haddad", progress: 4, completed: 0, joined: 76, tier: "SILVER" },
  { firstName: "Mariam", lastName: "Al Falasi", progress: 5, completed: 0, joined: 88, tier: "GOLD" },
  { firstName: "Hessa", lastName: "Al Ketbi", progress: REQUIRED_SESSIONS, completed: 0, joined: 104, tier: "GOLD" },
  { firstName: "Salma", lastName: "Al Shamsi", progress: 2, completed: 1, joined: 190, tier: "GOLD" },
];

const phoneFor = (index) => `+97150777${String(index + 1).padStart(4, "0")}`;

function guardTarget() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env, so there is no demo database to seed.");
  }

  const production = process.env.PRODUCTION_DATABASE_URL;
  if (!production) return;

  // Neon's pooled and direct endpoints differ only by "-pooler", so compare
  // with it stripped - otherwise the same database slips through as two hosts.
  const bare = (url) => host(url).replace("-pooler.", ".");
  if (bare(DATABASE_URL) === bare(production)) {
    throw new Error(
      [
        `Refusing to run: DATABASE_URL points at ${host(DATABASE_URL)}, which is PRODUCTION.`,
        "Demo data must not go into the live database - it would show up in your reports",
        "and sit alongside real clients. Point DATABASE_URL at the demo branch first.",
      ].join("\n"),
    );
  }
}

async function main() {
  guardTarget();
  console.log("");
  console.log(`target      : ${host(DATABASE_URL)}`);
  console.log(`             (demo database - production is refused by this script)`);
  console.log(`mode        : ${WRITE ? "WRITE" : "dry run - nothing will be saved"}`);
  console.log("");

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const clashes = [];
    if (await prisma.business.findFirst({ where: { name: BUSINESS_NAME } })) clashes.push(`a business named "${BUSINESS_NAME}"`);
    if (await prisma.user.findUnique({ where: { email: OWNER_EMAIL } })) clashes.push(`a user with email ${OWNER_EMAIL}`);
    const phones = CUSTOMERS.map((_, index) => phoneFor(index));
    const taken = await prisma.globalCustomer.count({ where: { normalizedPhone: { in: phones } } });
    if (taken) clashes.push(`${taken} of the demo phone numbers`);
    if (clashes.length) {
      throw new Error(`Stopped - this database already has ${clashes.join(", ")}. Nothing was changed.`);
    }

    const password = `Demo-${randomBytes(6).toString("base64url")}`;
    const passwordHash = await bcrypt.hash(password, 12);

    const summary = await prisma
      .$transaction(
        async (tx) => {
          const plan =
            (await tx.subscriptionPlan.findUnique({ where: { code: "GROWTH" } })) ??
            (await tx.subscriptionPlan.create({
              data: {
                code: "GROWTH",
                name: "Growth",
                maxBranches: 3,
                maxLoyaltyPrograms: 5,
                monthlyPrice: "200.00",
                annualPrice: "2000.00",
                billingCycleSupport: ["MONTHLY", "YEARLY"],
              },
            }));

          const business = await tx.business.create({
            data: { name: BUSINESS_NAME, businessType: "AESTHETIC_CLINIC", status: "ACTIVE" },
          });
          await tx.businessBranding.create({
            data: {
              businessId: business.id,
              // Quiet and clinical. A clinic card sits next to bank cards, and
              // a loud colour reads as a discount voucher.
              primaryColor: "#0F766E",
              secondaryColor: "#FFFFFF",
              backgroundColor: "#FFFFFF",
              textColor: "#111827",
              buttonColor: "#0F766E",
            },
          });
          await tx.customerTierSetting.create({
            data: {
              businessId: business.id,
              criteria: "VISITS_ONLY",
              tierQualificationWindow: "DAYS_90",
              tierMaintenanceMode: "DYNAMIC",
              silverVisitRequirement: 3,
              goldVisitRequirement: 8,
              vipVisitRequirement: 15,
            },
          });
          await tx.businessScannerSettings.create({ data: { businessId: business.id, soundEffectsEnabled: true } });
          await tx.businessCommunicationSettings.create({
            data: { businessId: business.id, whatsappEnabled: false, smsEnabled: false, emailEnabled: false, preferredDefaultChannel: "NONE" },
          });

          const branch = await tx.branch.create({
            data: {
              businessId: business.id,
              name: "Jumeirah Clinic",
              country: "United Arab Emirates",
              city: "Dubai",
              address: "Jumeirah Beach Road",
              status: "ACTIVE",
            },
          });

          const owner = await tx.user.create({
            data: {
              name: "Lumiere Clinic Manager",
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
              startDate: daysAgo(200),
              expiryDate: daysAgo(-165),
              renewalDate: daysAgo(-165),
            },
          });

          const program = await tx.loyaltyProgram.create({
            data: {
              businessId: business.id,
              businessType: "AESTHETIC_CLINIC",
              name: "Laser Package",
              productOrServiceName: "Session",
              description: "A course of six treatment sessions.",
              requiredStamps: REQUIRED_SESSIONS,
              // The package is paid for up front, so nothing is given away at
              // the start - the card counts down what the customer has left.
              startingBonusStamps: 0,
              startingStampPolicy: "NEVER",
              referralRewardBonusStamps: 1,
              cardTheme: "BEAUTY_SALON",
              stampEmoji: "✨",
              rewardName: "Complimentary Session",
              rewardDescription: "A complimentary session once the package is complete.",
              active: true,
            },
          });

          // The reason a clinic cares: something to come back for before the
          // package runs out, not only at the end of it.
          await tx.programReward.createMany({
            data: [
              {
                loyaltyProgramId: program.id,
                atStamp: MILESTONE_AT,
                rewardName: "Free Skin Consultation",
                rewardDescription: "A complimentary skin consultation halfway through the package.",
                completesCard: false,
              },
              {
                loyaltyProgramId: program.id,
                atStamp: REQUIRED_SESSIONS,
                rewardName: program.rewardName,
                rewardDescription: program.rewardDescription,
                completesCard: true,
              },
            ],
          });

          const stamps = [];
          const redemptions = [];

          for (const [index, person] of CUSTOMERS.entries()) {
            const phone = phoneFor(index);
            const joinedAt = daysAgo(person.joined);

            const globalCustomer = await tx.globalCustomer.create({
              data: { firstName: person.firstName, lastName: person.lastName, phone, normalizedPhone: phone },
            });

            const membership = await tx.businessCustomerMembership.create({
              data: {
                globalCustomerId: globalCustomer.id,
                businessId: business.id,
                firstName: person.firstName,
                lastName: person.lastName,
                phone,
                normalizedPhone: phone,
                createdBranchId: branch.id,
                createdByUserId: owner.id,
                marketingConsent: true,
                source: "OWNER",
                status: "ACTIVE",
                cardToken: token("cst"),
                cardStatus: "ACTIVE",
                referralCode: `LUM-${String(index + 1).padStart(3, "0")}`,
                referralEnabled: true,
                currentTier: person.tier,
                tierUpdatedAt: new Date(),
                joinedAt,
                notes: "Demo customer.",
              },
            });

            const programMembership = await tx.customerProgramMembership.create({
              data: {
                businessCustomerMembershipId: membership.id,
                loyaltyProgramId: program.id,
                earnedStamps: person.progress,
                bonusStamps: 0,
                enrollmentSource: "OWNER",
                status: "ACTIVE",
                scanToken: token("scan"),
                scanStatus: "ACTIVE",
                enrolledAt: joinedAt,
              },
            });

            const history = person.progress + person.completed * REQUIRED_SESSIONS;
            for (let visit = 0; visit < history; visit += 1) {
              stamps.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                issuedByUserId: owner.id,
                quantity: 1,
                reason: "Session",
                source: "QR_SCAN",
                idempotencyKey: `lumiere-demo-${programMembership.uuid}-${visit + 1}`,
                // Laser sessions are weeks apart, so spread the history out
                // instead of stacking every visit on the same afternoon.
                createdAt: daysAgo(Math.max(0.5, person.joined * (1 - (visit + 1) / (history + 1)))),
              });
            }

            for (let round = 0; round < person.completed; round += 1) {
              redemptions.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                loyaltyProgramId: program.id,
                rewardName: program.rewardName,
                requiredStamps: REQUIRED_SESSIONS,
                redeemedByUserId: owner.id,
                redeemedAt: daysAgo(Math.max(1, Math.floor(person.joined / 2))),
                idempotencyKey: `lumiere-demo-${programMembership.uuid}-redeem-${round + 1}`,
                notes: "Demo redemption.",
              });
            }
          }

          await tx.stampTransaction.createMany({ data: stamps });
          if (redemptions.length) await tx.rewardRedemption.createMany({ data: redemptions });

          const result = { branch, stamps: stamps.length, redemptions: redemptions.length };
          if (!WRITE) throw Object.assign(new DryRunRollback("dry run"), { result });
          return result;
        },
        { timeout: 170_000, maxWait: 20_000 },
      )
      .catch((error) => {
        if (error instanceof DryRunRollback) return { ...error.result, dryRun: true };
        throw error;
      });

    console.log(summary.dryRun ? "DRY RUN OK - everything checked, nothing saved." : "SAVED.");
    console.log(`Clinic    : ${BUSINESS_NAME} (branch: ${summary.branch.name})`);
    console.log(`Package   : Laser Package - ${REQUIRED_SESSIONS} sessions, reward at ${MILESTONE_AT} and at ${REQUIRED_SESSIONS}`);
    console.log(`Customers : ${CUSTOMERS.length}   Sessions recorded: ${summary.stamps}   Packages completed: ${summary.redemptions}`);
    if (!summary.dryRun) {
      console.log("");
      console.log("Demo login (shown only once - write it down):");
      console.log(`  Email:    ${OWNER_EMAIL}`);
      console.log(`  Password: ${password}`);
    } else {
      console.log("");
      console.log("Nothing was written. To create the demo clinic, run:");
      console.log("   node scripts/db/seed-demo-clinic.mjs --yes");
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
