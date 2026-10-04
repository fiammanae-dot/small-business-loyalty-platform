/**
 * Builds a ready-made demo of The Skin Lab for showing the platform to a
 * prospect or running a walkthrough.
 *
 *   The Skin Lab - 1 branch, 1 owner login, three prepaid MEMBERSHIP packages
 *   (White Lily / Golden Tulip / Royal Rose) with their real included
 *   treatments, and 30 customers spread across every stage - fresh cards,
 *   half-used, and fully used up - so the dashboard looks like a working
 *   clinic rather than an empty shell.
 *
 * TARGET: the DEMO database, never production. The whole point of a demo
 * account is that it leaves no trace in the real numbers, so this script
 * refuses to run against PRODUCTION_DATABASE_URL and says so.
 *
 * Additive only: it never edits or deletes existing rows, refuses to run if
 * the clinic is already there, and writes everything in ONE transaction, so it
 * either all lands or nothing does.
 *
 *   node scripts/db/seed-demo-skinlab.mjs          -> dry run: checks everything, writes nothing
 *   node scripts/db/seed-demo-skinlab.mjs --yes    -> writes the data
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
const BUSINESS_NAME = "The Skin Lab";
const OWNER_EMAIL = (process.env.SEED_DEMO_OWNER_EMAIL || "demo@theskinlab.ae").toLowerCase();
const REQUIRED_SESSIONS = 6;
const LOGO_URL = "https://theskinlab.ae/wp-content/uploads/2024/12/vectorpaint-5.png";

class DryRunRollback extends Error {}

const token = (prefix) => `${prefix}_${randomBytes(14).toString("base64url")}`;
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const host = (url) => new URL(url).hostname;

/**
 * The three prepaid membership packages, exactly as the clinic sells them.
 * Each is a card of six sessions that counts down; the customer picks one of
 * the included treatments on each visit.
 */
const PACKAGES = [
  {
    name: "White Lily Membership",
    price: "3000.00",
    ref: "WL",
    description:
      "A gentle rejuvenation membership designed for consistent skin maintenance, hydration, and self-care throughout the year.",
    treatments: [
      "Hydrafacial",
      "Organic Facial",
      "Forma Skin Tightening",
      "OxyGeneo Facial",
      "Full Body Laser Hair Reduction",
    ],
    benefits: [
      "Priority booking",
      "Exclusive member pricing on additional treatments",
      "Complimentary skin consultation & analysis",
      "Access to seasonal member offers and events",
    ],
  },
  {
    name: "Golden Tulip Membership",
    price: "6000.00",
    ref: "GT",
    description:
      "An advanced rejuvenation membership focused on skin quality, prevention, collagen stimulation, and refined natural beauty.",
    treatments: [
      "TSL Dermapen",
      "Dermapen + LC",
      "Hydro Oxy Facial",
      "Prophilo Skin Booster",
      "RRS Long Lasting ( LOLA )",
      "Botox Nabota Upper face",
      "Lip Booster ( Shine )",
      "1ML Filler ( Aileen )",
      "Sunekos performa skin booster",
      "Hayalift Skin Booster",
      "RRS Under eye",
      "Innovyal Under eye",
      "LC Hair",
      "Bloom Skin Booster",
    ],
    benefits: [
      "Priority booking",
      "Exclusive member-only pricing",
      "Personalized treatment planning",
      "Complimentary skin analysis & follow-up consultations",
      "Invitations to exclusive clinic events and seasonal experiences",
    ],
  },
  {
    name: "Royal Rose Membership",
    price: "12000.00",
    ref: "RR",
    description:
      "Our most exclusive rejuvenation membership, designed for complete face, skin, and hair renewal through advanced aesthetic and regenerative treatments.",
    treatments: [
      "RRS Trio Box",
      "Botox Dysport",
      "Sunekoss 1200 + Performa skin booster",
      "RRS U-Shape",
      "Xomage Hair / Skin",
      "BioSome Hair / Skin",
      "1 ML Filler Jeuvederm / Kyseness",
      "Facetim ( Calcium filler )",
      "Sculptra",
      "Gene Fill DX",
      "Lip Booster ( Teoxana )",
      "Volite Skin Booster Box",
      "SuneKoss Body",
      "Morpheus Body",
      "Morpheus Face + Salmon DNA",
      "Salmon DNA ( Cell Pro )",
      "Salmon DNA Croma ( Face or Under eye )",
    ],
    benefits: [
      "VIP priority booking",
      "Personalized yearly treatment plan",
      "Complimentary skin & hair analysis",
      "Access to exclusive launches and private events",
      "Special member pricing on additional treatments",
      "Luxury member gifting experience",
    ],
  },
];

// 30 customers. Names are written out; the package, sessions used and join
// date are derived so each package gets ten members covering the full range -
// a fresh card, several mid-way, and two already used up (to show the renewal).
const NAMES = [
  ["Noura", "Al Mansoori"], ["Aisha", "Al Suwaidi"], ["Reem", "Al Hashimi"],
  ["Fatima", "Khoury"], ["Layla", "Haddad"], ["Mariam", "Al Falasi"],
  ["Hessa", "Al Ketbi"], ["Salma", "Al Shamsi"], ["Shaikha", "Al Nuaimi"],
  ["Alia", "Al Marri"], ["Hind", "Al Zaabi"], ["Noor", "Al Qubaisi"],
  ["Amna", "Al Dhaheri"], ["Sara", "Al Ali"], ["Dana", "Al Mazrouei"],
  ["Latifa", "Al Suwaidi"], ["Moza", "Al Mansoori"], ["Wadeema", "Al Hashimi"],
  ["Afra", "Al Shamsi"], ["Shamma", "Al Nuaimi"], ["Rawda", "Khoury"],
  ["Khadija", "Haddad"], ["Ayesha", "Al Falasi"], ["Jawaher", "Al Ketbi"],
  ["Maitha", "Al Marri"], ["Asma", "Al Zaabi"], ["Rania", "Al Qubaisi"],
  ["Lamya", "Al Dhaheri"], ["Huda", "Al Ali"], ["Maryam", "Al Mazrouei"],
];

// Ten sessions-used values per package: one fresh (0), a spread through the
// middle, and two fully used up (6) so the renewal flow has something to show.
const USED_SPREAD = [1, 2, 3, 4, 5, 6, 0, 2, 4, 6];

const phoneFor = (index) => `+9715077${String(8001 + index)}`;
const tierFor = (used) => (used >= 6 ? "GOLD" : used >= 3 ? "SILVER" : "BRONZE");

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
        "and sit alongside real clients. Point SEED_DEMO_DATABASE_URL at the demo branch first.",
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
    const phones = NAMES.map((_, index) => phoneFor(index));
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
              logoUrl: LOGO_URL,
              // The Skin Lab's teal with a soft gold accent - clinical and
              // premium, so the card reads as a clinic rather than a voucher.
              primaryColor: "#0D7377",
              secondaryColor: "#C9A96A",
              backgroundColor: "#FFFFFF",
              textColor: "#1A1A1A",
              buttonColor: "#0D7377",
            },
          });
          // Memberships on: this hides visit tiers everywhere and turns on the
          // membership card behaviour for the business.
          await tx.businessMembershipSettings.create({ data: { businessId: business.id, enabled: true } });
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
              name: "Al Bateen Clinic",
              country: "United Arab Emirates",
              city: "Abu Dhabi",
              address: "Bainunah Street, Al Bateen",
              status: "ACTIVE",
            },
          });

          const owner = await tx.user.create({
            data: {
              name: "The Skin Lab Manager",
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
              startDate: daysAgo(220),
              expiryDate: daysAgo(-145),
              renewalDate: daysAgo(-145),
            },
          });

          // Create the three membership programs with their included treatments.
          const programs = [];
          for (const pkg of PACKAGES) {
            const program = await tx.loyaltyProgram.create({
              data: {
                businessId: business.id,
                businessType: "AESTHETIC_CLINIC",
                name: pkg.name,
                productOrServiceName: "Aesthetic Treatments",
                description: pkg.description,
                requiredStamps: REQUIRED_SESSIONS,
                isMembership: true,
                priceAmount: pkg.price,
                membershipBenefits: pkg.benefits,
                startingBonusStamps: 0,
                startingStampPolicy: "NEVER",
                referralRewardBonusStamps: 1,
                cardTheme: "BEAUTY_SALON",
                stampEmoji: "✨",
                rewardName: "Membership complete",
                rewardDescription: "All prepaid sessions used.",
                active: true,
              },
            });
            await tx.membershipTreatment.createMany({
              data: pkg.treatments.map((name, order) => ({
                loyaltyProgramId: program.id,
                name,
                sortOrder: order,
                active: true,
              })),
            });
            // One completing reward row, matching how the app creates a
            // membership program, so every reward lookup has a row to read.
            await tx.programReward.create({
              data: {
                loyaltyProgramId: program.id,
                atStamp: REQUIRED_SESSIONS,
                rewardName: "Membership complete",
                rewardDescription: "All prepaid sessions used.",
                completesCard: true,
              },
            });
            programs.push({ ...pkg, program });
          }

          const stamps = [];

          for (const [index, [firstName, lastName]] of NAMES.entries()) {
            const pkgIndex = index % PACKAGES.length;
            const withinPackage = Math.floor(index / PACKAGES.length);
            const used = USED_SPREAD[withinPackage];
            const entry = programs[pkgIndex];
            const phone = phoneFor(index);
            const joined = 10 + index * 6;
            const joinedAt = daysAgo(joined);

            const globalCustomer = await tx.globalCustomer.create({
              data: { firstName, lastName, phone, normalizedPhone: phone },
            });

            const membership = await tx.businessCustomerMembership.create({
              data: {
                globalCustomerId: globalCustomer.id,
                businessId: business.id,
                firstName,
                lastName,
                phone,
                normalizedPhone: phone,
                createdBranchId: branch.id,
                createdByUserId: owner.id,
                marketingConsent: true,
                source: "OWNER",
                status: "ACTIVE",
                cardToken: token("cst"),
                cardStatus: "ACTIVE",
                referralCode: `TSL-${String(index + 1).padStart(3, "0")}`,
                referralEnabled: true,
                currentTier: tierFor(used),
                tierUpdatedAt: new Date(),
                joinedAt,
                notes: "Demo customer.",
              },
            });

            const programMembership = await tx.customerProgramMembership.create({
              data: {
                businessCustomerMembershipId: membership.id,
                loyaltyProgramId: entry.program.id,
                earnedStamps: used,
                bonusStamps: 0,
                sessionsForfeited: 0,
                forfeitCyclesProcessed: 0,
                enrollmentSource: "OWNER",
                status: "ACTIVE",
                scanToken: token("scan"),
                scanStatus: "ACTIVE",
                enrolledAt: joinedAt,
              },
            });

            // One recorded visit per used session, each naming a treatment from
            // the package and spread across the time since the customer joined.
            for (let visit = 0; visit < used; visit += 1) {
              stamps.push({
                businessId: business.id,
                branchId: branch.id,
                customerProgramMembershipId: programMembership.id,
                issuedByUserId: owner.id,
                quantity: 1,
                reason: "Membership session",
                treatmentName: entry.treatments[visit % entry.treatments.length],
                source: "QR_SCAN",
                idempotencyKey: `skinlab-demo-${programMembership.uuid}-${visit + 1}`,
                createdAt: daysAgo(Math.max(0.5, joined * (1 - (visit + 1) / (used + 1)))),
              });
            }
          }

          await tx.stampTransaction.createMany({ data: stamps });

          const result = { branch, programs: programs.length, customers: NAMES.length, stamps: stamps.length };
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
    console.log(`Packages  : ${PACKAGES.map((p) => p.name).join(", ")}`);
    console.log(`Customers : ${summary.customers}   Sessions recorded: ${summary.stamps}`);
    if (!summary.dryRun) {
      console.log("");
      console.log("Demo login (shown only once - write it down):");
      console.log(`  Email:    ${OWNER_EMAIL}`);
      console.log(`  Password: ${password}`);
    } else {
      console.log("");
      console.log("Nothing was written. To create the demo, run:");
      console.log("   node scripts/db/seed-demo-skinlab.mjs --yes");
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
