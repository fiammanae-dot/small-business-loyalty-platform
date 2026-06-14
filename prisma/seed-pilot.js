/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const PILOT_DATABASE_NAME = "loyalty_platform_pilot";
const PASSWORD = requireEnv("PILOT_SEED_PASSWORD");
const SYSTEM_ADMIN_EMAIL = requireEnv("PILOT_SYSTEM_ADMIN_EMAIL");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for pilot seeding.`);
  }

  return value;
}

function assertPilotDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Point it to loyalty_platform_pilot before running this seed.");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (databaseName !== PILOT_DATABASE_NAME) {
    throw new Error(`Refusing to seed database "${databaseName}". Expected "${PILOT_DATABASE_NAME}".`);
  }
}

function generateCardToken() {
  return `cst_${randomBytes(18).toString("base64url")}`;
}

function generateScanToken() {
  return `scan_${randomBytes(24).toString("base64url")}`;
}

function normalizePhone(phone) {
  let normalized = phone.trim().replace(/[\s\-()]/g, "");

  if (normalized.startsWith("05")) {
    normalized = `+971${normalized.slice(1)}`;
  } else if (normalized.startsWith("971")) {
    normalized = `+${normalized}`;
  } else if (!normalized.startsWith("+") && normalized.length > 0) {
    normalized = `+${normalized}`;
  }

  return normalized;
}

const subscriptionPlans = [
  {
    name: "Starter",
    maxBranches: 1,
    maxLoyaltyPrograms: 1,
    features: ["Basic customer database", "QR loyalty card", "Manual message preparation"],
    priceMonthly: "29.00",
  },
  {
    name: "Growth",
    maxBranches: 3,
    maxLoyaltyPrograms: 10,
    features: ["Multiple branches", "Multiple loyalty programs", "Customer engagement", "Manual message outbox"],
    priceMonthly: "79.00",
  },
  {
    name: "Multi-Branch",
    maxBranches: 10,
    maxLoyaltyPrograms: 25,
    features: ["Multiple branches", "Multiple loyalty programs", "Multi-branch reporting readiness"],
    priceMonthly: "0.00",
  },
  {
    name: "Premium",
    maxBranches: 25,
    maxLoyaltyPrograms: 50,
    features: ["Everything in Multi-Branch", "Advanced reporting readiness", "Priority support readiness"],
    priceMonthly: "0.00",
  },
];

const messageTemplates = [
  ["REWARD_READY", "Reward Ready", "Congratulations! Your reward is ready to redeem."],
  ["NEAR_REWARD", "Near Reward", "You're only {{remaining_stamps}} stamps away from your reward."],
  ["BIRTHDAY", "Birthday", "Happy Birthday! Enjoy a special reward from us."],
  ["INACTIVE_30_DAYS", "Inactive Customer", "We miss you. Visit us again and continue earning rewards."],
  ["INACTIVE_60_DAYS", "Inactive Customer", "We miss you. Visit us again and continue earning rewards."],
  ["INACTIVE_90_DAYS", "Inactive Customer", "We miss you. Visit us again and continue earning rewards."],
  ["REWARD_REDEEMED", "Reward Redeemed", "Thank you for redeeming your reward."],
  ["WELCOME_CUSTOMER", "Welcome Customer", "Welcome to our loyalty program."],
];

const pilotBusinesses = [
  {
    uuid: "10000000-0000-4000-8000-000000000001",
    name: "Harbor Coffee House",
    businessType: "COFFEE_SHOP",
    plan: "Growth",
    branding: {
      primaryColor: "#F97316",
      secondaryColor: "#FDBA74",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#F97316",
    },
    branches: [
      {
        uuid: "11000000-0000-4000-8000-000000000001",
        name: "Al Khan",
        country: "United Arab Emirates",
        city: "Sharjah",
        address: "Al Khan Corniche",
      },
      {
        uuid: "11000000-0000-4000-8000-000000000002",
        name: "Dubai Marina",
        country: "United Arab Emirates",
        city: "Dubai",
        address: "Marina Walk",
      },
    ],
    users: {
      owner: ["Harbor Owner", "owner@harborcoffee.example"],
      manager: ["Harbor Branch Manager", "manager@harborcoffee.example"],
      staff: ["Harbor Staff", "staff@harborcoffee.example"],
    },
    program: {
      uuid: "12000000-0000-4000-8000-000000000001",
      name: "Coffee Club",
      productOrServiceName: "Coffee",
      description: "Earn stamps on coffee purchases.",
      requiredStamps: 12,
      startingBonusStamps: 2,
      rewardName: "Free Coffee",
      rewardDescription: "A complimentary regular coffee.",
    },
    customers: [
      ["Ahmed", "Al Nuaimi", "+971501110001", "13000000-0000-4000-8000-000000000001", "14000000-0000-4000-8000-000000000001", 0],
      ["Sara", "Hassan", "+971501110002", "13000000-0000-4000-8000-000000000002", "14000000-0000-4000-8000-000000000002", 3],
      ["Omar", "Khalid", "+971501110003", "13000000-0000-4000-8000-000000000003", "14000000-0000-4000-8000-000000000003", 6],
    ],
  },
  {
    uuid: "20000000-0000-4000-8000-000000000001",
    name: "Cedar Table Restaurant",
    businessType: "RESTAURANT",
    plan: "Growth",
    branding: {
      primaryColor: "#F97316",
      secondaryColor: "#FDBA74",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#F97316",
    },
    branches: [
      {
        uuid: "21000000-0000-4000-8000-000000000001",
        name: "Jumeirah",
        country: "United Arab Emirates",
        city: "Dubai",
        address: "Jumeirah Beach Road",
      },
      {
        uuid: "21000000-0000-4000-8000-000000000002",
        name: "Business Bay",
        country: "United Arab Emirates",
        city: "Dubai",
        address: "Bay Avenue",
      },
    ],
    users: {
      owner: ["Cedar Owner", "owner@cedartable.example"],
      manager: ["Cedar Branch Manager", "manager@cedartable.example"],
      staff: ["Cedar Staff", "staff@cedartable.example"],
    },
    program: {
      uuid: "22000000-0000-4000-8000-000000000001",
      name: "Meal Rewards",
      productOrServiceName: "Meal",
      description: "Earn stamps on qualifying meals.",
      requiredStamps: 10,
      startingBonusStamps: 0,
      rewardName: "Free Meal",
      rewardDescription: "A complimentary selected meal.",
    },
    customers: [
      ["Mariam", "Saeed", "+971502220001", "23000000-0000-4000-8000-000000000001", "24000000-0000-4000-8000-000000000001", 0],
      ["Yousef", "Karim", "+971502220002", "23000000-0000-4000-8000-000000000002", "24000000-0000-4000-8000-000000000002", 2],
      ["Lina", "Haddad", "+971502220003", "23000000-0000-4000-8000-000000000003", "24000000-0000-4000-8000-000000000003", 5],
    ],
  },
  {
    uuid: "30000000-0000-4000-8000-000000000001",
    name: "Sharp Line Barbershop",
    businessType: "BARBERSHOP",
    plan: "Starter",
    branding: {
      primaryColor: "#F97316",
      secondaryColor: "#FDBA74",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#F97316",
    },
    branches: [
      {
        uuid: "31000000-0000-4000-8000-000000000001",
        name: "Al Barsha",
        country: "United Arab Emirates",
        city: "Dubai",
        address: "Al Barsha 1",
      },
    ],
    users: {
      owner: ["Sharp Line Owner", "owner@sharpline.example"],
      manager: ["Sharp Line Branch Manager", "manager@sharpline.example"],
      staff: ["Sharp Line Staff", "staff@sharpline.example"],
    },
    program: {
      uuid: "32000000-0000-4000-8000-000000000001",
      name: "Haircut Club",
      productOrServiceName: "Haircut",
      description: "Earn stamps on haircut visits.",
      requiredStamps: 11,
      startingBonusStamps: 1,
      rewardName: "Free Haircut",
      rewardDescription: "A complimentary standard haircut.",
    },
    customers: [
      ["Khaled", "Mansour", "+971503330001", "33000000-0000-4000-8000-000000000001", "34000000-0000-4000-8000-000000000001", 0],
      ["Samir", "Ali", "+971503330002", "33000000-0000-4000-8000-000000000002", "34000000-0000-4000-8000-000000000002", 4],
      ["Nader", "Saleh", "+971503330003", "33000000-0000-4000-8000-000000000003", "34000000-0000-4000-8000-000000000003", 8],
    ],
  },
];

assertPilotDatabase();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function upsertUser({ name, email, passwordHash, role, businessId = null, branchId = null }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role,
      businessId,
      branchId,
      status: "ACTIVE",
      sessionVersion: { increment: 1 },
    },
    create: {
      name,
      email,
      passwordHash,
      role,
      businessId,
      branchId,
      status: "ACTIVE",
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await upsertUser({
    name: "System Administrator",
    email: SYSTEM_ADMIN_EMAIL,
    passwordHash,
    role: "PLATFORM_OWNER",
  });

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  for (const [templateType, title, message] of messageTemplates) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { businessId: null, templateType },
      select: { id: true },
    });

    if (existing) {
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: { title, message, active: true },
      });
    } else {
      await prisma.messageTemplate.create({
        data: { templateType, title, message, active: true },
      });
    }
  }

  for (const seed of pilotBusinesses) {
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: seed.plan } });
    const business = await prisma.business.upsert({
      where: { uuid: seed.uuid },
      update: {
        name: seed.name,
        businessType: seed.businessType,
        status: "ACTIVE",
      },
      create: {
        uuid: seed.uuid,
        name: seed.name,
        businessType: seed.businessType,
        status: "ACTIVE",
      },
    });

    await prisma.businessBranding.upsert({
      where: { businessId: business.id },
      update: seed.branding,
      create: {
        businessId: business.id,
        ...seed.branding,
      },
    });

    await prisma.businessCommunicationSettings.upsert({
      where: { businessId: business.id },
      update: {
        preferredDefaultChannel: "NONE",
        whatsappEnabled: false,
        smsEnabled: false,
        emailEnabled: false,
      },
      create: {
        businessId: business.id,
        preferredDefaultChannel: "NONE",
        whatsappEnabled: false,
        smsEnabled: false,
        emailEnabled: false,
      },
    });

    const branches = [];
    for (const branchSeed of seed.branches) {
      branches.push(
        await prisma.branch.upsert({
          where: { uuid: branchSeed.uuid },
          update: {
            businessId: business.id,
            name: branchSeed.name,
            country: branchSeed.country,
            city: branchSeed.city,
            address: branchSeed.address,
            status: "ACTIVE",
          },
          create: {
            ...branchSeed,
            businessId: business.id,
            status: "ACTIVE",
          },
        }),
      );
    }

    const primaryBranch = branches[0];
    const owner = await upsertUser({
      name: seed.users.owner[0],
      email: seed.users.owner[1],
      passwordHash,
      role: "BUSINESS_OWNER",
      businessId: business.id,
      branchId: primaryBranch.id,
    });
    await upsertUser({
      name: seed.users.manager[0],
      email: seed.users.manager[1],
      passwordHash,
      role: "BRANCH_MANAGER",
      businessId: business.id,
      branchId: primaryBranch.id,
    });
    await upsertUser({
      name: seed.users.staff[0],
      email: seed.users.staff[1],
      passwordHash,
      role: "STAFF",
      businessId: business.id,
      branchId: primaryBranch.id,
    });

    const existingActiveSubscription = await prisma.businessSubscription.findFirst({
      where: { businessId: business.id, status: "ACTIVE" },
      select: { id: true },
    });

    if (existingActiveSubscription) {
      await prisma.businessSubscription.update({
        where: { id: existingActiveSubscription.id },
        data: {
          subscriptionPlanId: plan.id,
          startDate: new Date(),
          expiryDate: null,
          renewalDate: null,
          endDate: null,
        },
      });
    } else {
      await prisma.businessSubscription.create({
        data: {
          businessId: business.id,
          subscriptionPlanId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
        },
      });
    }

    const program = await prisma.loyaltyProgram.upsert({
      where: { uuid: seed.program.uuid },
      update: {
        businessId: business.id,
        businessType: seed.businessType,
        ...seed.program,
        active: true,
        startDate: null,
        endDate: null,
      },
      create: {
        businessId: business.id,
        businessType: seed.businessType,
        ...seed.program,
        active: true,
      },
    });

    for (const [firstName, lastName, phone, membershipUuid, programMembershipUuid, earnedStamps] of seed.customers) {
      const normalizedPhone = normalizePhone(phone);
      const globalCustomer = await prisma.globalCustomer.upsert({
        where: { normalizedPhone },
        update: {
          firstName,
          lastName,
          phone,
        },
        create: {
          firstName,
          lastName,
          phone,
          normalizedPhone,
        },
      });

      const existingMembership = await prisma.businessCustomerMembership.findUnique({
        where: {
          businessId_globalCustomerId: {
            businessId: business.id,
            globalCustomerId: globalCustomer.id,
          },
        },
        select: { id: true, cardToken: true },
      });

      const membership = existingMembership
        ? await prisma.businessCustomerMembership.update({
            where: { id: existingMembership.id },
            data: {
              createdBranchId: primaryBranch.id,
              createdByUserId: owner.id,
              marketingConsent: true,
              source: "OWNER",
              status: "ACTIVE",
              cardStatus: "ACTIVE",
              notes: "Pilot customer record.",
            },
          })
        : await prisma.businessCustomerMembership.create({
            data: {
              uuid: membershipUuid,
              globalCustomerId: globalCustomer.id,
              businessId: business.id,
              createdBranchId: primaryBranch.id,
              createdByUserId: owner.id,
              marketingConsent: true,
              source: "OWNER",
              status: "ACTIVE",
              cardToken: generateCardToken(),
              cardStatus: "ACTIVE",
              cardCreatedAt: new Date(),
              notes: "Pilot customer record.",
            },
          });

      const existingProgramMembership = await prisma.customerProgramMembership.findUnique({
        where: {
          businessCustomerMembershipId_loyaltyProgramId: {
            businessCustomerMembershipId: membership.id,
            loyaltyProgramId: program.id,
          },
        },
        select: { id: true },
      });

      if (existingProgramMembership) {
        await prisma.customerProgramMembership.update({
          where: { id: existingProgramMembership.id },
          data: {
            earnedStamps,
            bonusStamps: seed.program.startingBonusStamps,
            enrollmentSource: "OWNER",
            status: "ACTIVE",
            scanStatus: "ACTIVE",
          },
        });
      } else {
        await prisma.customerProgramMembership.create({
          data: {
            uuid: programMembershipUuid,
            businessCustomerMembershipId: membership.id,
            loyaltyProgramId: program.id,
            earnedStamps,
            bonusStamps: seed.program.startingBonusStamps,
            enrollmentSource: "OWNER",
            status: "ACTIVE",
            scanToken: generateScanToken(),
            scanStatus: "ACTIVE",
            scanCreatedAt: new Date(),
          },
        });
      }
    }
  }

  console.log("Pilot seed completed for loyalty_platform_pilot.");
  console.log(`Default password for seeded users: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
