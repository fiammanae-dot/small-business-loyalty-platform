/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const nextEnv = require("@next/env");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

nextEnv.loadEnvConfig(process.cwd());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const demoPassword = requireEnv("DEMO_SEED_PASSWORD");
const baseUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/+$/, "");
const demoOwnerEmail = requireEnv("DEMO_OWNER_EMAIL");
const demoManagerEmail = requireEnv("DEMO_MANAGER_EMAIL");
const demoStaffEmail = requireEnv("DEMO_STAFF_EMAIL");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for demo seeding.`);
  }

  return value;
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

async function createMissingStampTransaction(data) {
  const existing = await prisma.stampTransaction.findFirst({
    where: {
      customerProgramMembershipId: data.customerProgramMembershipId,
      reason: data.reason,
      source: "QR_SCAN",
    },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.stampTransaction.create({
    data: {
      businessId: data.businessId,
      branchId: data.branchId,
      customerProgramMembershipId: data.customerProgramMembershipId,
      issuedByUserId: data.issuedByUserId,
      quantity: data.quantity,
      reason: data.reason,
      source: "QR_SCAN",
    },
    select: { id: true },
  });
}

async function createMissingAlert(data) {
  const existing = await prisma.activityAlert.findFirst({
    where: {
      businessId: data.businessId,
      alertType: data.alertType,
      description: data.description,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.activityAlert.update({
      where: { id: existing.id },
      data: {
        branchId: data.branchId,
        userId: data.userId,
        customerProgramMembershipId: data.customerProgramMembershipId,
        severity: data.severity,
        status: "OPEN",
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      select: { id: true },
    });
  }

  return prisma.activityAlert.create({
    data: {
      businessId: data.businessId,
      branchId: data.branchId,
      userId: data.userId,
      customerProgramMembershipId: data.customerProgramMembershipId,
      alertType: data.alertType,
      severity: data.severity,
      description: data.description,
      status: "OPEN",
    },
    select: { id: true },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const growthPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Growth" },
    update: {
      maxBranches: 3,
      maxLoyaltyPrograms: 10,
      features: [
        "Multiple loyalty programs",
        "Referral program",
        "Customer segments",
        "Birthday rewards",
        "Basic analytics",
      ],
      priceMonthly: "79.00",
    },
    create: {
      name: "Growth",
      maxBranches: 3,
      maxLoyaltyPrograms: 10,
      features: [
        "Multiple loyalty programs",
        "Referral program",
        "Customer segments",
        "Birthday rewards",
        "Basic analytics",
      ],
      priceMonthly: "79.00",
    },
  });

  const business = await prisma.business.upsert({
    where: { uuid: "11111111-1111-4111-8111-111111111111" },
    update: {
      name: "Orange Demo Cafe",
      businessType: "COFFEE_SHOP",
      status: "ACTIVE",
    },
    create: {
      uuid: "11111111-1111-4111-8111-111111111111",
      name: "Orange Demo Cafe",
      businessType: "COFFEE_SHOP",
      status: "ACTIVE",
    },
  });

  await prisma.businessBranding.upsert({
    where: { businessId: business.id },
    update: {
      primaryColor: "#F97316",
      secondaryColor: "#FDBA74",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#F97316",
    },
    create: {
      businessId: business.id,
      primaryColor: "#F97316",
      secondaryColor: "#FDBA74",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      buttonColor: "#F97316",
    },
  });

  const activeSubscription = await prisma.businessSubscription.findFirst({
    where: { businessId: business.id, status: "ACTIVE" },
    select: { id: true },
  });

  if (activeSubscription) {
    await prisma.businessSubscription.update({
      where: { id: activeSubscription.id },
      data: {
        subscriptionPlanId: growthPlan.id,
        endDate: null,
      },
    });
  } else {
    await prisma.businessSubscription.create({
      data: {
        businessId: business.id,
        subscriptionPlanId: growthPlan.id,
        status: "ACTIVE",
        startDate: new Date(),
      },
    });
  }

  const branchSeeds = [
    { uuid: "22222222-2222-4222-8222-222222222221", name: "Al Khan", country: "United Arab Emirates", city: "Sharjah", address: "Al Khan Demo Street" },
    { uuid: "22222222-2222-4222-8222-222222222222", name: "Dubai Marina", country: "United Arab Emirates", city: "Dubai", address: "Dubai Marina Demo Walk" },
    { uuid: "22222222-2222-4222-8222-222222222223", name: "Abu Dhabi", country: "United Arab Emirates", city: "Abu Dhabi", address: "Abu Dhabi Demo Avenue" },
  ];

  const branches = {};
  for (const branchSeed of branchSeeds) {
    branches[branchSeed.name] = await prisma.branch.upsert({
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
    });
  }

  const owner = await prisma.user.upsert({
    where: { email: demoOwnerEmail },
    update: {
      name: "Demo Business Owner",
      passwordHash,
      role: "BUSINESS_OWNER",
      businessId: business.id,
      branchId: branches["Al Khan"].id,
      status: "ACTIVE",
      sessionVersion: { increment: 1 },
    },
    create: {
      name: "Demo Business Owner",
      email: demoOwnerEmail,
      passwordHash,
      role: "BUSINESS_OWNER",
      businessId: business.id,
      branchId: branches["Al Khan"].id,
      status: "ACTIVE",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: demoManagerEmail },
    update: {
      name: "Demo Branch Manager",
      passwordHash,
      role: "BRANCH_MANAGER",
      businessId: business.id,
      branchId: branches["Al Khan"].id,
      status: "ACTIVE",
      sessionVersion: { increment: 1 },
    },
    create: {
      name: "Demo Branch Manager",
      email: demoManagerEmail,
      passwordHash,
      role: "BRANCH_MANAGER",
      businessId: business.id,
      branchId: branches["Al Khan"].id,
      status: "ACTIVE",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: demoStaffEmail },
    update: {
      name: "Demo Staff User",
      passwordHash,
      role: "STAFF",
      businessId: business.id,
      branchId: branches["Al Khan"].id,
      status: "ACTIVE",
      sessionVersion: { increment: 1 },
    },
    create: {
      name: "Demo Staff User",
      email: demoStaffEmail,
      passwordHash,
      role: "STAFF",
      businessId: business.id,
      branchId: branches["Al Khan"].id,
      status: "ACTIVE",
    },
  });

  const program = await prisma.loyaltyProgram.upsert({
    where: { uuid: "33333333-3333-4333-8333-333333333333" },
    update: {
      businessId: business.id,
      name: "Coffee Club",
      businessType: "COFFEE_SHOP",
      productOrServiceName: "Coffee",
      description: "Demo coffee loyalty program.",
      requiredStamps: 12,
      startingBonusStamps: 2,
      rewardName: "Free Coffee",
      rewardDescription: "Free Coffee",
      active: true,
      startDate: null,
      endDate: null,
    },
    create: {
      uuid: "33333333-3333-4333-8333-333333333333",
      businessId: business.id,
      name: "Coffee Club",
      businessType: "COFFEE_SHOP",
      productOrServiceName: "Coffee",
      description: "Demo coffee loyalty program.",
      requiredStamps: 12,
      startingBonusStamps: 2,
      rewardName: "Free Coffee",
      rewardDescription: "Free Coffee",
      active: true,
    },
  });

  const customerSeeds = [
    {
      firstName: "Ahmed",
      lastName: "Demo",
      phone: "+971500000001",
      earnedStamps: 0,
      membershipUuid: "44444444-4444-4444-8444-444444444441",
      programUuid: "55555555-5555-4555-8555-555555555551",
    },
    {
      firstName: "Sara",
      lastName: "Demo",
      phone: "+971500000002",
      earnedStamps: 4,
      membershipUuid: "44444444-4444-4444-8444-444444444442",
      programUuid: "55555555-5555-4555-8555-555555555552",
    },
    {
      firstName: "Omar",
      lastName: "Demo",
      phone: "+971500000003",
      earnedStamps: 10,
      membershipUuid: "44444444-4444-4444-8444-444444444443",
      programUuid: "55555555-5555-4555-8555-555555555553",
    },
  ];

  const demoCustomers = [];

  for (const seed of customerSeeds) {
    const normalizedPhone = normalizePhone(seed.phone);
    const globalCustomer = await prisma.globalCustomer.upsert({
      where: { normalizedPhone },
      update: {
        firstName: seed.firstName,
        lastName: seed.lastName,
        phone: seed.phone,
        email: null,
      },
      create: {
        firstName: seed.firstName,
        lastName: seed.lastName,
        phone: seed.phone,
        normalizedPhone,
        email: null,
      },
    });

    const existingMembership = await prisma.businessCustomerMembership.findUnique({
      where: {
        businessId_globalCustomerId: {
          businessId: business.id,
          globalCustomerId: globalCustomer.id,
        },
      },
      select: { id: true },
    });

    const membership = existingMembership
      ? await prisma.businessCustomerMembership.update({
          where: { id: existingMembership.id },
          data: {
            createdBranchId: branches["Al Khan"].id,
            createdByUserId: owner.id,
            marketingConsent: true,
            source: "OWNER",
            status: "ACTIVE",
            cardStatus: "ACTIVE",
            notes: "Demo customer for scanner, card, and stamp testing.",
          },
        })
      : await prisma.businessCustomerMembership.create({
          data: {
            uuid: seed.membershipUuid,
            globalCustomerId: globalCustomer.id,
            businessId: business.id,
            createdBranchId: branches["Al Khan"].id,
            createdByUserId: owner.id,
            marketingConsent: true,
            source: "OWNER",
            status: "ACTIVE",
            cardToken: generateCardToken(),
            cardStatus: "ACTIVE",
            cardCreatedAt: new Date(),
            notes: "Demo customer for scanner, card, and stamp testing.",
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

    const programMembership = existingProgramMembership
      ? await prisma.customerProgramMembership.update({
          where: { id: existingProgramMembership.id },
          data: {
            earnedStamps: seed.earnedStamps,
            bonusStamps: 2,
            enrollmentSource: "OWNER",
            status: "ACTIVE",
            scanStatus: "ACTIVE",
          },
        })
      : await prisma.customerProgramMembership.create({
          data: {
            uuid: seed.programUuid,
            businessCustomerMembershipId: membership.id,
            loyaltyProgramId: program.id,
            earnedStamps: seed.earnedStamps,
            bonusStamps: 2,
            enrollmentSource: "OWNER",
            status: "ACTIVE",
            scanToken: generateScanToken(),
            scanStatus: "ACTIVE",
            scanCreatedAt: new Date(),
          },
        });

    demoCustomers.push({
      ...seed,
      globalCustomer,
      membership,
      programMembership,
    });
  }

  const sara = demoCustomers.find((customer) => customer.firstName === "Sara");
  const omar = demoCustomers.find((customer) => customer.firstName === "Omar");

  await createMissingStampTransaction({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    customerProgramMembershipId: sara.programMembership.id,
    issuedByUserId: staff.id,
    quantity: 1,
    reason: "[DEMO] Sara QR scan single coffee",
  });
  await createMissingStampTransaction({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    customerProgramMembershipId: sara.programMembership.id,
    issuedByUserId: staff.id,
    quantity: 3,
    reason: "[DEMO] Sara QR scan group coffee order",
  });
  await createMissingStampTransaction({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    customerProgramMembershipId: omar.programMembership.id,
    issuedByUserId: manager.id,
    quantity: 5,
    reason: "[DEMO] Omar QR scan family coffee order",
  });
  await createMissingStampTransaction({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    customerProgramMembershipId: omar.programMembership.id,
    issuedByUserId: staff.id,
    quantity: 5,
    reason: "[DEMO] Omar QR scan office coffee order",
  });

  await createMissingAlert({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    userId: staff.id,
    customerProgramMembershipId: sara.programMembership.id,
    alertType: "MULTIPLE_STAMPS",
    severity: "LOW",
    description: "[DEMO] Multiple stamps issued for Sara Demo.",
  });
  await createMissingAlert({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    userId: manager.id,
    customerProgramMembershipId: omar.programMembership.id,
    alertType: "MAX_QUANTITY_STAMPS",
    severity: "MEDIUM",
    description: "[DEMO] Maximum quantity stamp issuance for Omar Demo.",
  });
  await createMissingAlert({
    businessId: business.id,
    branchId: branches["Al Khan"].id,
    userId: staff.id,
    customerProgramMembershipId: omar.programMembership.id,
    alertType: "CUSTOMER_24H_HIGH_VOLUME",
    severity: "HIGH",
    description: "[DEMO] Customer received high stamp volume within 24 hours.",
  });

  const resultRows = await prisma.businessCustomerMembership.findMany({
    where: { businessId: business.id, globalCustomer: { normalizedPhone: { in: customerSeeds.map((seed) => normalizePhone(seed.phone)) } } },
    include: {
      globalCustomer: true,
      programMemberships: {
        where: { loyaltyProgramId: program.id },
        include: { loyaltyProgram: true },
      },
    },
    orderBy: { globalCustomer: { firstName: "asc" } },
  });

  console.log("Demo seed complete.");
  console.log("");
  console.log("Login credentials:");
  console.log(`Business Owner: ${demoOwnerEmail}`);
  console.log(`Branch Manager: ${demoManagerEmail}`);
  console.log(`Staff: ${demoStaffEmail}`);
  console.log("");
  console.log("Customer cards and scan URLs:");
  for (const membership of resultRows) {
    const programMembership = membership.programMemberships[0];
    const earned = programMembership.earnedStamps;
    const bonus = programMembership.bonusStamps;
    console.log(`${membership.globalCustomer.firstName} ${membership.globalCustomer.lastName ?? ""}`.trim());
    console.log(`  Card: ${baseUrl}/card/${membership.cardToken}`);
    console.log(`  Scan: ${baseUrl}/scan/${programMembership.scanToken}`);
    console.log(`  Progress: ${earned + bonus} / ${program.requiredStamps} (${earned} earned + ${bonus} bonus)`);
  }
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
