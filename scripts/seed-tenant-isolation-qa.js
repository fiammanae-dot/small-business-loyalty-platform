/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const nextEnv = require("@next/env");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

nextEnv.loadEnvConfig(process.cwd());

const QA_PASSWORD = "Test@12345";
const REQUIRED_RESET_FLAG = "true";
const REQUIRED_STAMPS = 10;

const subscriptionPlans = [
  { code: "STARTER", name: "Starter", maxBranches: 1, maxLoyaltyPrograms: 1, monthlyPrice: "100.00", annualPrice: "1000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
  { code: "GROWTH", name: "Growth", maxBranches: 3, maxLoyaltyPrograms: 5, monthlyPrice: "200.00", annualPrice: "2000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
  { code: "MULTI_BRANCH", name: "Multi Branch", maxBranches: 10, maxLoyaltyPrograms: 15, monthlyPrice: "0.00", annualPrice: "1000.00", billingCycleSupport: ["YEARLY"] },
];

const businessSeeds = [
  {
    key: "emiratescoffee",
    name: "Emirates Coffee House",
    businessType: "COFFEE_SHOP",
    planCode: "STARTER",
    branch: { name: "Downtown Coffee Bar", country: "United Arab Emirates", city: "Dubai", address: "Sheikh Mohammed bin Rashid Boulevard" },
    branding: { primaryColor: "#3B2416", secondaryColor: "#F8EFE5", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#3B2416" },
    program: {
      name: "Coffee Rewards",
      productOrServiceName: "Coffee",
      description: "Reward repeat coffee visits.",
      rewardName: "Free Coffee",
      rewardDescription: "Redeem one complimentary house coffee.",
      cardTheme: "COFFEE_CAFE",
      cardDesign: design("PREMIUM", "COFFEE_CUP", "COFFEE_BEANS", "CLASSIC", "SOFT"),
    },
  },
  {
    key: "royalbarbers",
    name: "Royal Barbers",
    businessType: "BARBERSHOP",
    planCode: "STARTER",
    branch: { name: "Royal Barbers Main Branch", country: "United Arab Emirates", city: "Dubai", address: "Jumeirah Beach Road" },
    branding: { primaryColor: "#111827", secondaryColor: "#F9FAFB", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#111827" },
    program: {
      name: "Royal Grooming Card",
      productOrServiceName: "Haircut",
      description: "Reward loyal grooming visits.",
      rewardName: "Free Haircut",
      rewardDescription: "Redeem one standard haircut.",
      cardTheme: "RETAIL_GENERAL",
      cardDesign: design("LUXURY", "SCISSORS", "SCISSORS", "PREMIUM", "LUXURY"),
    },
  },
  {
    key: "glowbeauty",
    name: "Glow Beauty Lounge",
    businessType: "BEAUTY_SALON",
    planCode: "GROWTH",
    branch: { name: "Glow Beauty Lounge Main", country: "United Arab Emirates", city: "Abu Dhabi", address: "Al Maryah Island" },
    branding: { primaryColor: "#BE185D", secondaryColor: "#FCE7F3", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#BE185D" },
    program: {
      name: "Glow Rewards",
      productOrServiceName: "Beauty Service",
      description: "Reward repeat beauty appointments.",
      rewardName: "Free Treatment Add-on",
      rewardDescription: "Redeem one selected treatment add-on.",
      cardTheme: "BEAUTY_SALON",
      cardDesign: design("LUXURY", "LIPSTICK", "BEAUTY_PATTERN", "LUXURY", "GLASS"),
    },
  },
  {
    key: "bluewavecarwash",
    name: "BlueWave Car Wash",
    businessType: "CAR_CARE_CENTER",
    planCode: "GROWTH",
    branch: { name: "BlueWave Express Bay", country: "United Arab Emirates", city: "Sharjah", address: "Al Khan Corniche" },
    branding: { primaryColor: "#0369A1", secondaryColor: "#E0F2FE", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#0369A1" },
    program: {
      name: "Wash Club",
      productOrServiceName: "Car Wash",
      description: "Reward repeat wash visits.",
      rewardName: "Free Exterior Wash",
      rewardDescription: "Redeem one exterior wash.",
      cardTheme: "AUTOMOTIVE",
      cardDesign: design("MODERN", "WATER_DROP", "WATER_BUBBLES", "MODERN", "PREMIUM"),
    },
  },
  {
    key: "grillkitchen",
    name: "The Grill Kitchen",
    businessType: "RESTAURANT",
    planCode: "STARTER",
    branch: { name: "The Grill Kitchen Main", country: "United Arab Emirates", city: "Dubai", address: "City Walk" },
    branding: { primaryColor: "#7C2D12", secondaryColor: "#FFF7ED", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#7C2D12" },
    program: {
      name: "Grill Rewards",
      productOrServiceName: "Meal",
      description: "Reward frequent dining visits.",
      rewardName: "Free Main Course",
      rewardDescription: "Redeem one selected main course.",
      cardTheme: "RESTAURANT",
      cardDesign: design("PREMIUM", "PLATE", "FOOD_PATTERN", "PREMIUM", "SOFT"),
    },
  },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function design(layoutStyle, stampIcon, backgroundPattern, typographyPreset, decorationStyle) {
  return {
    version: "v1",
    layoutStyle,
    cardStyle: layoutStyle === "MODERN" ? "modern-clean" : layoutStyle === "PREMIUM" ? "premium-dark" : layoutStyle === "LUXURY" ? "minimal-light" : "classic",
    stampJourneyStyle: layoutStyle === "MODERN" ? "PROGRESS_BAR" : "CIRCLES",
    stampIcon,
    progressStyle: "linear",
    typographyPreset,
    backgroundStyle: "PATTERN",
    backgroundPattern,
    decorationStyle,
    rewardStyle: decorationStyle === "LUXURY" ? "PREMIUM" : "FILLED",
    footerStyle: "scan-cta",
    animationStyle: "subtle",
    templateId: `${layoutStyle.toLowerCase()}-${stampIcon.toLowerCase()}`,
    visibleSections: {
      logo: true,
      businessName: true,
      customerName: true,
      tierBadge: true,
      rewardBox: true,
      progress: true,
      qr: true,
      footer: true,
      referral: true,
      visits: true,
      programName: true,
    },
  };
}

function assertSafeTarget() {
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run tenant QA reset in a production environment.");
  }

  if (process.env.ALLOW_QA_RESET !== REQUIRED_RESET_FLAG) {
    throw new Error(`Refusing to reset QA data. Set ALLOW_QA_RESET=${REQUIRED_RESET_FLAG} to confirm this is a development or staging database.`);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const host = parsed.hostname.toLowerCase();
  const databaseNameLower = databaseName.toLowerCase();
  const urlLower = databaseUrl.toLowerCase();
  const productionMarkers = ["production", "prod", "small-business-loyalty-platform", "vercel"];

  if (databaseNameLower === "neondb" || productionMarkers.some((marker) => databaseNameLower.includes(marker) || host.includes(marker) || urlLower.includes(marker))) {
    throw new Error(`Refusing to run tenant QA reset against protected database target "${maskDatabaseUrl(databaseUrl)}".`);
  }

  return { databaseName, host, maskedUrl: maskDatabaseUrl(databaseUrl) };
}

function maskDatabaseUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.username) parsed.username = "***";
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return value.replace(/:\/\/[^:@/]+:[^@/]+@/, "://***:***@");
  }
}

function token(prefix) {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function normalizePhone(phone) {
  let normalized = phone.trim().replace(/[\s\-()]/g, "");
  if (normalized.startsWith("05")) normalized = `+971${normalized.slice(1)}`;
  if (normalized.startsWith("971")) normalized = `+${normalized}`;
  if (normalized.startsWith("00971")) normalized = `+971${normalized.slice(5)}`;
  return normalized;
}

function userEmail(seed, role) {
  if (role === "owner") return `owner@${seed.key}.test`;
  if (role === "manager") return `manager@${seed.key}.test`;
  return `${role}@${seed.key}.test`;
}

function customerSeeds(seed) {
  const prefix = seed.key.slice(0, 4).toUpperCase();
  const base = [
    { label: "0/10", firstName: "Mina", lastName: "New", phone: `+97150${seed.key.length}100001`, progress: 0, tier: "BRONZE" },
    { label: "1/10", firstName: "Noura", lastName: "First", phone: `+97150${seed.key.length}100002`, progress: 1, tier: "BRONZE" },
    { label: "2/10", firstName: "Omar", lastName: "Starter", phone: `+97150${seed.key.length}100003`, progress: 2, tier: "BRONZE" },
    { label: "4/10", firstName: "Leen", lastName: "Regular", phone: `+97150${seed.key.length}100004`, progress: 4, tier: "SILVER" },
    { label: "6/10", firstName: "Yousef", lastName: "Active", phone: `+97150${seed.key.length}100005`, progress: 6, tier: "SILVER" },
    { label: "8/10", firstName: "Farah", lastName: "Loyal", phone: `+97150${seed.key.length}100006`, progress: 8, tier: "GOLD" },
    { label: "9/10", firstName: "Khalid", lastName: "Close", phone: `+97150${seed.key.length}100007`, progress: 9, tier: "GOLD" },
    { label: "10/10 reward ready", firstName: "Sara", lastName: "Ready", phone: `+97150${seed.key.length}100008`, progress: 10, tier: "VIP" },
    { label: "redeemed reward", firstName: "Layla", lastName: "Redeemed", phone: `+97150${seed.key.length}100009`, progress: 0, tier: "GOLD", redemptions: 1, historicalStamps: 10 },
    { label: "multiple completed cycles", firstName: "Zayed", lastName: "Champion", phone: `+97150${seed.key.length}100010`, progress: 3, tier: "VIP", redemptions: 2, historicalStamps: 23 },
  ];

  if (seed.key === "emiratescoffee") {
    base[0] = { ...base[0], firstName: "Ahmed", lastName: "Ali", phone: "+971501111111", label: "shared phone A" };
  }
  if (seed.key === "royalbarbers") {
    base[0] = { ...base[0], firstName: "Ahmed", lastName: null, phone: "+971501111111", label: "shared phone B" };
  }
  if (seed.key === "glowbeauty") {
    base[1] = { ...base[1], firstName: "Sara", lastName: "Noor", phone: "+971502222222", label: "shared phone C" };
  }
  if (seed.key === "bluewavecarwash") {
    base[1] = { ...base[1], firstName: "Sara", lastName: "Blue", phone: "+971502222222", label: "shared phone D" };
  }

  return base.map((customer, index) => ({
    ...customer,
    email: `${customer.firstName.toLowerCase()}.${seed.key}.${index + 1}@customer.test`,
    referralCode: `${prefix}-${String(index + 1).padStart(2, "0")}`,
  }));
}

function qaPhones() {
  return Array.from(new Set(businessSeeds.flatMap((seed) => customerSeeds(seed).map((customer) => normalizePhone(customer.phone)))));
}

async function ensurePlans() {
  const plans = {};
  for (const plan of subscriptionPlans) {
    plans[plan.code] = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  return plans;
}

async function resetQaData() {
  const qaBusinessNames = businessSeeds.map((seed) => seed.name);
  const qaEmails = [
    "admin@Loyalty Card UAE.test",
    ...businessSeeds.flatMap((seed) => [userEmail(seed, "owner"), userEmail(seed, "manager"), userEmail(seed, "staff1"), userEmail(seed, "staff2")]),
  ];
  const businesses = await prisma.business.findMany({
    where: { name: { in: qaBusinessNames } },
    select: { id: true },
  });
  const businessIds = businesses.map((business) => business.id);
  const users = await prisma.user.findMany({
    where: {
      OR: [{ email: { in: qaEmails } }, businessIds.length ? { businessId: { in: businessIds } } : undefined].filter(Boolean),
    },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (!businessIds.length && !userIds.length) return { deletedBusinesses: 0, deletedUsers: 0 };

  await prisma.$transaction(async (tx) => {
    if (userIds.length) {
      await tx.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    }

    if (businessIds.length) {
      await tx.supportSessionActivity.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.supportSession.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.supportRequest.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessNotification.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.messageDeliveryQueue.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.customerNotification.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.engagementEvent.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.referralEvent.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.referralReward.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.referral.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.cooldownEvent.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.cooldownRule.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.alertEvent.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.activityAlert.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.scanEvent.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.rewardRedemption.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.stampTransaction.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.customerProgramMembership.deleteMany({ where: { businessCustomerMembership: { businessId: { in: businessIds } } } });
      await tx.loyaltyProgram.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessCustomerMembership.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.payment.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.invoiceAuditLog.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.invoice.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.subscriptionAuditLog.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessSubscription.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessDesignPreset.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.messageTemplate.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.customerNotificationTemplate.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessCommunicationSettings.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessScannerSettings.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.customerTierSetting.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.businessBranding.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.auditEvent.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.user.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.branch.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.business.deleteMany({ where: { id: { in: businessIds } } });
    }

    if (userIds.length) {
      await tx.auditEvent.deleteMany({ where: { actorUserId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await tx.globalCustomer.deleteMany({
      where: {
        normalizedPhone: { in: qaPhones() },
        memberships: { none: {} },
      },
    });
  });

  return { deletedBusinesses: businessIds.length, deletedUsers: userIds.length };
}

async function createUser({ email, name, role, passwordHash, businessId = null, branchId = null }) {
  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      businessId,
      branchId,
      status: "ACTIVE",
      forcePasswordChange: false,
    },
  });
}

async function createBusinessSeed(seed, passwordHash, plans, admin) {
  const business = await prisma.business.create({
    data: {
      name: seed.name,
      businessType: seed.businessType,
      status: "ACTIVE",
      supportAccessPolicy: "IMMEDIATE",
    },
  });

  await prisma.businessBranding.create({ data: { businessId: business.id, ...seed.branding } });
  await prisma.customerTierSetting.create({
    data: {
      businessId: business.id,
      criteria: "VISITS_ONLY",
      tierQualificationWindow: "DAYS_90",
      tierMaintenanceMode: "DYNAMIC",
      silverVisitRequirement: 5,
      goldVisitRequirement: 15,
      vipVisitRequirement: 30,
    },
  });
  await prisma.businessScannerSettings.create({ data: { businessId: business.id, soundEffectsEnabled: true } });
  await prisma.businessCommunicationSettings.create({
    data: {
      businessId: business.id,
      whatsappEnabled: false,
      smsEnabled: false,
      emailEnabled: false,
      preferredDefaultChannel: "NONE",
    },
  });

  const branch = await prisma.branch.create({
    data: {
      businessId: business.id,
      ...seed.branch,
      status: "ACTIVE",
    },
  });

  const owner = await createUser({
    email: userEmail(seed, "owner"),
    name: `${seed.name} Owner`,
    role: "BUSINESS_OWNER",
    passwordHash,
    businessId: business.id,
    branchId: branch.id,
  });
  const manager = await createUser({
    email: userEmail(seed, "manager"),
    name: `${seed.name} Branch Manager`,
    role: "BRANCH_MANAGER",
    passwordHash,
    businessId: business.id,
    branchId: branch.id,
  });
  const staff1 = await createUser({
    email: userEmail(seed, "staff1"),
    name: `${seed.name} Staff 1`,
    role: "STAFF",
    passwordHash,
    businessId: business.id,
    branchId: branch.id,
  });
  const staff2 = await createUser({
    email: userEmail(seed, "staff2"),
    name: `${seed.name} Staff 2`,
    role: "STAFF",
    passwordHash,
    businessId: business.id,
    branchId: branch.id,
  });

  const program = await prisma.loyaltyProgram.create({
    data: {
      businessId: business.id,
      name: seed.program.name,
      businessType: seed.businessType,
      productOrServiceName: seed.program.productOrServiceName,
      description: seed.program.description,
      requiredStamps: REQUIRED_STAMPS,
      startingBonusStamps: 0,
      startingStampPolicy: "NEVER",
      rewardName: seed.program.rewardName,
      rewardDescription: seed.program.rewardDescription,
      referralRewardBonusStamps: 1,
      cardTheme: seed.program.cardTheme,
      cardDesign: seed.program.cardDesign,
      active: true,
    },
  });

  const subscription = await prisma.businessSubscription.create({
    data: {
      businessId: business.id,
      subscriptionPlanId: plans[seed.planCode].id,
      status: "ACTIVE",
      billingCycle: seed.planCode === "GROWTH" ? "YEARLY" : "MONTHLY",
      startDate: addDays(new Date(), -10),
      expiryDate: addDays(new Date(), seed.planCode === "GROWTH" ? 355 : 20),
      renewalDate: addDays(new Date(), seed.planCode === "GROWTH" ? 355 : 20),
    },
  });
  await prisma.subscriptionAuditLog.create({
    data: {
      businessId: business.id,
      businessSubscriptionId: subscription.id,
      userId: admin.id,
      action: "STATUS_CHANGED",
      previousValue: null,
      newValue: "ACTIVE",
    },
  });

  await prisma.businessDesignPreset.create({
    data: {
      businessId: business.id,
      name: "QA Baseline",
      cardDesign: seed.program.cardDesign,
    },
  });

  const customers = [];
  for (const [index, customer] of customerSeeds(seed).entries()) {
    customers.push(await createCustomerScenario({ seed, customer, index, business, branch, owner, staff: index % 2 === 0 ? staff1 : staff2, program }));
  }

  await prisma.auditEvent.createMany({
    data: [
      {
        actorUserId: owner.id,
        businessId: business.id,
        branchId: branch.id,
        action: "TENANT_QA_BUSINESS_CREATED",
        entityType: "Business",
        entityId: String(business.id),
        metadata: { source: "tenant-isolation-qa-seed" },
      },
      {
        actorUserId: staff1.id,
        businessId: business.id,
        branchId: branch.id,
        action: "TENANT_QA_CUSTOMERS_CREATED",
        entityType: "BusinessCustomerMembership",
        entityId: String(customers[0].membership.id),
        metadata: { source: "tenant-isolation-qa-seed", count: customers.length },
      },
    ],
  });

  return {
    business,
    branch,
    program,
    users: [owner, manager, staff1, staff2],
    customers,
  };
}

async function createCustomerScenario({ seed, customer, index, business, branch, owner, staff, program }) {
  const normalizedPhone = normalizePhone(customer.phone);
  const globalCustomer = await prisma.globalCustomer.upsert({
    where: { normalizedPhone },
    update: {
      phone: normalizedPhone,
      email: customer.email,
    },
    create: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: normalizedPhone,
      normalizedPhone,
      email: customer.email,
    },
  });

  const membership = await prisma.businessCustomerMembership.create({
    data: {
      globalCustomerId: globalCustomer.id,
      businessId: business.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: normalizedPhone,
      normalizedPhone,
      email: customer.email,
      createdBranchId: branch.id,
      createdByUserId: owner.id,
      marketingConsent: true,
      source: index % 3 === 0 ? "STAFF" : "OWNER",
      status: "ACTIVE",
      cardToken: token("card_qa"),
      cardStatus: "ACTIVE",
      referralCode: customer.referralCode,
      referralEnabled: true,
      currentTier: customer.tier,
      tierUpdatedAt: new Date(),
      notes: `Tenant QA scenario: ${customer.label}.`,
    },
  });

  const programMembership = await prisma.customerProgramMembership.create({
    data: {
      businessCustomerMembershipId: membership.id,
      loyaltyProgramId: program.id,
      earnedStamps: customer.progress,
      bonusStamps: 0,
      enrollmentSource: "OWNER",
      status: "ACTIVE",
      scanToken: token("scan_qa"),
      scanStatus: "ACTIVE",
    },
  });

  const historicalStamps = customer.historicalStamps ?? customer.progress;
  for (let count = 0; count < historicalStamps; count += 1) {
    await prisma.stampTransaction.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        customerProgramMembershipId: programMembership.id,
        issuedByUserId: staff.id,
        quantity: 1,
        reason: `Tenant QA ${customer.label} stamp ${count + 1}`,
        source: "QR_SCAN",
        idempotencyKey: `${seed.key}-${index + 1}-stamp-${count + 1}`,
        createdAt: addDays(new Date(), -Math.max(historicalStamps - count, 1)),
      },
    });
  }

  for (let redemption = 0; redemption < (customer.redemptions ?? 0); redemption += 1) {
    await prisma.rewardRedemption.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        customerProgramMembershipId: programMembership.id,
        loyaltyProgramId: program.id,
        rewardName: program.rewardName,
        requiredStamps: program.requiredStamps,
        redeemedByUserId: staff.id,
        redeemedAt: addDays(new Date(), -(customer.redemptions - redemption)),
        idempotencyKey: `${seed.key}-${index + 1}-redemption-${redemption + 1}`,
        notes: `Tenant QA ${customer.label} redemption.`,
      },
    });
  }

  await prisma.engagementEvent.create({
    data: {
      businessId: business.id,
      customerId: membership.id,
      eventType: "WELCOME_CUSTOMER",
      eventDate: new Date(),
      status: "ACTIVE",
      metadata: { source: "tenant-isolation-qa-seed", scenario: customer.label },
    },
  });

  await prisma.scanEvent.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      scannedByUserId: staff.id,
      customerProgramMembershipId: programMembership.id,
      scanToken: programMembership.scanToken,
      result: "VALID",
    },
  });

  if (customer.progress >= program.requiredStamps) {
    await prisma.customerNotification.create({
      data: {
        businessId: business.id,
        businessCustomerMembershipId: membership.id,
        notificationType: "REWARD_AVAILABLE",
        channel: "WHATSAPP",
        title: "Reward Available",
        messageBody: `${program.rewardName} is ready.`,
        deliveryStatus: "READY",
        metadata: { source: "tenant-isolation-qa-seed" },
      },
    });
  }

  return { globalCustomer, membership, programMembership, scenario: customer.label };
}

async function main() {
  const target = assertSafeTarget();
  console.warn("WARNING: Tenant isolation QA reset will delete and recreate Loyalty Card UAE QA fixture data.");
  console.warn("Target database:", target.maskedUrl);
  console.warn("Only known QA businesses/users created by this script are targeted.");

  const resetSummary = await resetQaData();
  const passwordHash = await bcrypt.hash(QA_PASSWORD, 12);
  const plans = await ensurePlans();

  const admin = await prisma.user.upsert({
    where: { email: "admin@Loyalty Card UAE.test" },
    update: {
      name: "Loyalty Card UAE QA System Administrator",
      passwordHash,
      role: "PLATFORM_OWNER",
      status: "ACTIVE",
      businessId: null,
      branchId: null,
      forcePasswordChange: false,
      sessionVersion: { increment: 1 },
    },
    create: {
      name: "Loyalty Card UAE QA System Administrator",
      email: "admin@Loyalty Card UAE.test",
      passwordHash,
      role: "PLATFORM_OWNER",
      status: "ACTIVE",
      forcePasswordChange: false,
    },
  });

  const created = [];
  for (const seed of businessSeeds) {
    created.push(await createBusinessSeed(seed, passwordHash, plans, admin));
  }

  const credentials = [
    { business: "Loyalty Card UAE", role: "System Admin", email: "admin@Loyalty Card UAE.test", password: QA_PASSWORD },
    ...created.flatMap((entry, index) => {
      const seed = businessSeeds[index];
      return [
        { business: entry.business.name, role: "Business Owner", email: userEmail(seed, "owner"), password: QA_PASSWORD },
        { business: entry.business.name, role: "Branch Manager", email: userEmail(seed, "manager"), password: QA_PASSWORD },
        { business: entry.business.name, role: "Staff", email: userEmail(seed, "staff1"), password: QA_PASSWORD },
        { business: entry.business.name, role: "Staff", email: userEmail(seed, "staff2"), password: QA_PASSWORD },
      ];
    }),
  ];

  const businessesCreated = created.length;
  const usersCreated = credentials.length;
  const customersCreated = created.reduce((total, entry) => total + entry.customers.length, 0);
  const programsCreated = created.length;

  console.log("");
  console.log("Tenant Isolation QA seed completed.");
  console.log(`Database: ${target.databaseName || "(unknown)"} @ ${target.host}`);
  console.log(`Deleted QA businesses: ${resetSummary.deletedBusinesses}`);
  console.log(`Deleted QA users: ${resetSummary.deletedUsers}`);
  console.log(`Businesses created: ${businessesCreated}`);
  console.log(`Users created: ${usersCreated}`);
  console.log(`Customers created: ${customersCreated}`);
  console.log(`Programs created: ${programsCreated}`);
  console.log("");
  console.log("Credentials:");
  console.table(credentials);
  console.log("Shared-phone tenant isolation cases:");
  console.table([
    { phone: "+971501111111", business: "Emirates Coffee House", customer: "Ahmed Ali" },
    { phone: "+971501111111", business: "Royal Barbers", customer: "Ahmed" },
    { phone: "+971502222222", business: "Glow Beauty Lounge", customer: "Sara Noor" },
    { phone: "+971502222222", business: "BlueWave Car Wash", customer: "Sara Blue" },
  ]);
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
