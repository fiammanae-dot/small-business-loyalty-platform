/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes } = require("node:crypto");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const nextEnv = require("@next/env");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

nextEnv.loadEnvConfig(process.cwd());

const QA_PASSWORD = "Test@12345";
const REQUIRED_STAMPS = 10;
const WARNING = "THIS WILL DELETE ALL CURRENT USERS, BUSINESSES, CUSTOMERS, PROGRAMS, TRANSACTIONS, AND QA DATA.";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function logStep(message, details = undefined) {
  const timestamp = new Date().toISOString();
  if (details === undefined) {
    console.log(`[full-qa-debug] ${timestamp} ${message}`);
    return;
  }
  console.log(`[full-qa-debug] ${timestamp} ${message}`, details);
}

const subscriptionPlans = [
  { code: "STARTER", name: "Starter", maxBranches: 1, maxLoyaltyPrograms: 1, monthlyPrice: "100.00", annualPrice: "1000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
  { code: "GROWTH", name: "Growth", maxBranches: 3, maxLoyaltyPrograms: 5, monthlyPrice: "200.00", annualPrice: "2000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
  { code: "MULTI_BRANCH", name: "Multi Branch", maxBranches: 10, maxLoyaltyPrograms: 15, monthlyPrice: "0.00", annualPrice: "1000.00", billingCycleSupport: ["YEARLY"] },
];

const businesses = [
  seed("emiratescoffee", "Emirates Coffee House", "COFFEE_SHOP", "STARTER", "#3B2416", "COFFEE_CAFE", "COFFEE_CUP", "Coffee Rewards", "Coffee", "Free Coffee", "Downtown Coffee Bar", "Dubai"),
  seed("royalbarbers", "Royal Barbers", "BARBERSHOP", "STARTER", "#111827", "RETAIL_GENERAL", "SCISSORS", "Royal Grooming Card", "Haircut", "Free Haircut", "Royal Barbers Main", "Dubai"),
  seed("glowbeauty", "Glow Beauty Lounge", "BEAUTY_SALON", "GROWTH", "#BE185D", "BEAUTY_SALON", "LIPSTICK", "Glow Rewards", "Beauty Service", "Free Treatment Add-on", "Glow Beauty Main", "Abu Dhabi"),
  seed("bluewavecarwash", "BlueWave Car Wash", "CAR_CARE_CENTER", "GROWTH", "#0369A1", "AUTOMOTIVE", "WATER_DROP", "Wash Club", "Car Wash", "Free Exterior Wash", "BlueWave Express Bay", "Sharjah"),
  seed("grillkitchen", "The Grill Kitchen", "RESTAURANT", "STARTER", "#7C2D12", "RESTAURANT", "PLATE", "Grill Rewards", "Meal", "Free Main Course", "The Grill Kitchen Main", "Dubai"),
  seed("urbanfitness", "Urban Fitness Studio", "OTHER", "GROWTH", "#4338CA", "RETAIL_GENERAL", "STAR", "Fitness Rewards", "Class Visit", "Free Group Class", "Urban Fitness Marina", "Dubai"),
  seed("freshmart", "FreshMart Grocery", "OTHER", "STARTER", "#15803D", "RETAIL_GENERAL", "GIFT", "FreshMart Rewards", "Grocery Visit", "AED 25 Store Credit", "FreshMart Neighborhood Store", "Ajman"),
  seed("pearldental", "Pearl Dental Clinic", "OTHER", "GROWTH", "#0F766E", "RETAIL_GENERAL", "CHECK", "Dental Care Rewards", "Dental Visit", "Free Whitening Consultation", "Pearl Dental Main", "Abu Dhabi"),
  seed("luxuryspa", "Luxury Spa Center", "BEAUTY_SALON", "GROWTH", "#7E22CE", "BEAUTY_SALON", "MIRROR", "Spa Rewards", "Spa Visit", "Free Aromatherapy Upgrade", "Luxury Spa Center Main", "Dubai"),
  seed("quickfixauto", "QuickFix Auto Garage", "CAR_CARE_CENTER", "GROWTH", "#B45309", "AUTOMOTIVE", "CAR", "Auto Care Rewards", "Service Visit", "Free Inspection", "QuickFix Main Garage", "Ras Al Khaimah"),
];

function seed(key, name, businessType, planCode, primaryColor, cardTheme, stampIcon, programName, product, rewardName, branchName, city) {
  return {
    key,
    name,
    businessType,
    planCode,
    branding: { primaryColor, secondaryColor: "#FFFFFF", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: primaryColor },
    branches: [
      { name: branchName, country: "United Arab Emirates", city, address: `${city} Central District` },
      ...(planCode === "GROWTH" ? [{ name: `${name} Branch 2`, country: "United Arab Emirates", city: city === "Dubai" ? "Sharjah" : "Dubai", address: "QA Secondary Branch" }] : []),
    ],
    programs: [
      {
        name: programName,
        productOrServiceName: product,
        description: `QA loyalty program for ${name}.`,
        rewardName,
        rewardDescription: `Redeem ${rewardName.toLowerCase()} after ${REQUIRED_STAMPS} visits.`,
        cardTheme,
        cardDesign: design("PREMIUM", stampIcon, patternForBusinessType(businessType), "MODERN", "SOFT"),
      },
      ...(planCode === "GROWTH" ? [{
        name: `${product} Plus`,
        productOrServiceName: product,
        description: `Second QA program for ${name}.`,
        rewardName: `${rewardName} Plus`,
        rewardDescription: `Redeem upgraded ${rewardName.toLowerCase()}.`,
        cardTheme,
        cardDesign: design("MODERN", stampIcon, patternForBusinessType(businessType), "PREMIUM", "PREMIUM"),
      }] : []),
    ],
  };
}

function design(layoutStyle, stampIcon, backgroundPattern, typographyPreset, decorationStyle) {
  return {
    version: "v1",
    layoutStyle,
    cardStyle: layoutStyle === "MODERN" ? "modern-clean" : layoutStyle === "LUXURY" ? "minimal-light" : "premium-dark",
    stampJourneyStyle: layoutStyle === "MODERN" ? "PROGRESS_BAR" : "CIRCLES",
    stampIcon,
    progressStyle: "linear",
    typographyPreset,
    backgroundStyle: "PATTERN",
    backgroundPattern,
    decorationStyle,
    rewardStyle: decorationStyle === "PREMIUM" ? "PREMIUM" : "FILLED",
    footerStyle: "scan-cta",
    animationStyle: "subtle",
    templateId: `qa-${layoutStyle.toLowerCase()}-${stampIcon.toLowerCase()}`,
    visibleSections: { logo: true, businessName: true, customerName: true, tierBadge: true, rewardBox: true, progress: true, qr: true, footer: true, referral: true, visits: true, programName: true },
  };
}

function patternForBusinessType(type) {
  if (type === "COFFEE_SHOP") return "COFFEE_BEANS";
  if (type === "RESTAURANT") return "FOOD_PATTERN";
  if (type === "BARBERSHOP") return "SCISSORS";
  if (type === "BEAUTY_SALON") return "BEAUTY_PATTERN";
  if (type === "CAR_CARE_CENTER") return "WATER_BUBBLES";
  return "SUBTLE_DOTS";
}

function assertSafeTarget() {
  logStep("assertSafeTarget: environment snapshot before safety checks", {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_QA_RESET: process.env.ALLOW_QA_RESET,
    QA_DATABASE: process.env.QA_DATABASE,
    CONFIRM_FULL_DATA_WIPE: process.env.CONFIRM_FULL_DATA_WIPE,
  });
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing full QA wipe in a production runtime.");
  }
  for (const [key, expected] of Object.entries({ ALLOW_QA_RESET: "true", QA_DATABASE: "true", CONFIRM_FULL_DATA_WIPE: "true" })) {
    if (String(process.env[key] ?? "").trim() !== expected) throw new Error(`Refusing full QA wipe. Set ${key}=${expected}.`);
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(process.env.DATABASE_URL);
  return { databaseName: parsed.pathname.replace(/^\//, ""), host: parsed.hostname, maskedUrl: maskDatabaseUrl(process.env.DATABASE_URL) };
}

function maskDatabaseUrl(value) {
  const parsed = new URL(value);
  parsed.username = parsed.username ? "***" : "";
  parsed.password = parsed.password ? "***" : "";
  return parsed.toString();
}

async function fullWipe() {
  logStep("fullWipe: table discovery query starting");
  const rows = await prisma.$queryRaw`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;
  logStep("fullWipe: table discovery query completed", { tableCount: rows.length });
  if (!rows.length) {
    logStep("fullWipe: no tables found to truncate");
    return 0;
  }
  const tableList = rows.map((row) => `"${row.table_schema}"."${row.table_name}"`).join(", ");
  logStep("fullWipe: lock diagnostic query starting");
  const lockRows = await prisma.$queryRaw`
    SELECT pid, state, wait_event_type, wait_event, query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state <> 'idle'
    ORDER BY query_start ASC
    LIMIT 10
  `;
  logStep("fullWipe: lock diagnostic query completed", { activeSessions: lockRows.length });
  if (lockRows.length) console.table(lockRows);
  logStep("fullWipe: TRUNCATE starting", { tableCount: rows.length });
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  logStep("fullWipe: TRUNCATE completed", { tableCount: rows.length });
  return rows.length;
}

async function ensurePlans() {
  logStep("ensurePlans: starting");
  const plans = {};
  for (const plan of subscriptionPlans) {
    logStep("ensurePlans: creating plan", { code: plan.code });
    plans[plan.code] = await prisma.subscriptionPlan.create({ data: plan });
    logStep("ensurePlans: created plan", { code: plan.code, id: plans[plan.code].id });
  }
  logStep("ensurePlans: completed");
  return plans;
}

async function createUser({ name, email, role, passwordHash, businessId = null, branchId = null }) {
  return prisma.user.create({ data: { name, email, role, passwordHash, businessId, branchId, status: "ACTIVE", forcePasswordChange: false } });
}

function email(seed, role) {
  if (role === "owner") return `owner@${seed.key}.test`;
  if (role === "manager") return `manager@${seed.key}.test`;
  return `${role}@${seed.key}.test`;
}

function normalizePhone(phone) {
  let normalized = phone.trim().replace(/[\s\-()]/g, "");
  if (normalized.startsWith("05")) normalized = `+971${normalized.slice(1)}`;
  if (normalized.startsWith("971")) normalized = `+${normalized}`;
  if (normalized.startsWith("00971")) normalized = `+971${normalized.slice(5)}`;
  return normalized;
}

function token(prefix) {
  return `${prefix}_${randomBytes(14).toString("base64url")}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function customerScenario(index) {
  const scenarios = [
    { label: "0/10", progress: 0, tier: "BRONZE" },
    { label: "1/10", progress: 1, tier: "BRONZE" },
    { label: "2/10", progress: 2, tier: "BRONZE" },
    { label: "3/10", progress: 3, tier: "BRONZE" },
    { label: "4/10", progress: 4, tier: "SILVER" },
    { label: "5/10", progress: 5, tier: "SILVER" },
    { label: "6/10", progress: 6, tier: "SILVER" },
    { label: "7/10", progress: 7, tier: "GOLD" },
    { label: "8/10", progress: 8, tier: "GOLD" },
    { label: "9/10", progress: 9, tier: "GOLD" },
    { label: "10/10 reward ready", progress: 10, tier: "VIP" },
    { label: "redeemed reward", progress: 0, tier: "GOLD", historicalStamps: 10, redemptions: 1 },
    { label: "multiple completed cycles", progress: 3, tier: "VIP", historicalStamps: 23, redemptions: 2 },
    { label: "inactive customer", progress: 2, tier: "BRONZE", status: "INACTIVE" },
    { label: "VIP customer", progress: 8, tier: "VIP" },
    { label: "recently joined customer", progress: 1, tier: "BRONZE", recent: true },
  ];
  return scenarios[index % scenarios.length];
}

function customerName(seed, index) {
  const names = [
    ["Mina", "Hassan"], ["Noura", "Saeed"], ["Omar", "Khalil"], ["Leen", "Farouk"], ["Yousef", "Mansour"],
    ["Farah", "Salem"], ["Khalid", "Nasser"], ["Sara", "Ready"], ["Layla", "Redeemed"], ["Zayed", "Champion"],
    ["Huda", "Karim"], ["Rami", "Faisal"], ["Aisha", "Noor"], ["Tariq", "Hamad"], ["Mariam", "Sultan"],
  ];
  if (index === 0 && seed.key === "emiratescoffee") return ["Ahmed", "Ali"];
  if (index === 0 && seed.key === "royalbarbers") return ["Ahmed", null];
  if (index === 0 && seed.key === "glowbeauty") return ["Mr Ahmed", null];
  const [first, last] = names[index % names.length];
  return [first, `${last}${Math.floor(index / names.length) || ""}`];
}

function customerPhone(seedIndex, customerIndex) {
  if (customerIndex === 0 && seedIndex < 3) return "+971501111111";
  return `+9715${String(seedIndex + 1).padStart(1, "0")}${String(customerIndex + 1000000).slice(0, 7)}`;
}

async function createCustomer({ seed, seedIndex, customerIndex, business, branches, owner, staffUsers, programs }) {
  if (customerIndex % 10 === 0) logStep("createCustomer: batch starting", { business: seed.name, customerIndex });
  const scenario = customerScenario(customerIndex);
  const [firstName, lastName] = customerName(seed, customerIndex);
  const normalizedPhone = normalizePhone(customerPhone(seedIndex, customerIndex));
  const emailAddress = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${seed.key}.${customerIndex + 1}@customer.test`;
  const branch = branches[customerIndex % branches.length];
  const staff = staffUsers[customerIndex % staffUsers.length];
  const program = programs[customerIndex % programs.length];

  const globalCustomer = await prisma.globalCustomer.upsert({
    where: { normalizedPhone },
    update: { phone: normalizedPhone, email: emailAddress },
    create: { firstName, lastName, phone: normalizedPhone, normalizedPhone, email: emailAddress },
  });

  const membership = await prisma.businessCustomerMembership.create({
    data: {
      globalCustomerId: globalCustomer.id,
      businessId: business.id,
      firstName,
      lastName,
      phone: normalizedPhone,
      normalizedPhone,
      email: emailAddress,
      createdBranchId: branch.id,
      createdByUserId: owner.id,
      marketingConsent: customerIndex % 5 !== 0,
      source: customerIndex % 3 === 0 ? "STAFF" : "OWNER",
      status: scenario.status ?? "ACTIVE",
      cardToken: token("card_qa"),
      cardStatus: "ACTIVE",
      referralCode: `${seed.key.slice(0, 4).toUpperCase()}-${String(customerIndex + 1).padStart(3, "0")}`,
      referralEnabled: true,
      currentTier: scenario.tier,
      tierUpdatedAt: new Date(),
      joinedAt: scenario.recent ? addDays(new Date(), -1) : addDays(new Date(), -customerIndex - 5),
      notes: `Full QA scenario: ${scenario.label}.`,
    },
  });

  const programMembership = await prisma.customerProgramMembership.create({
    data: {
      businessCustomerMembershipId: membership.id,
      loyaltyProgramId: program.id,
      earnedStamps: scenario.progress,
      bonusStamps: 0,
      enrollmentSource: customerIndex % 4 === 0 ? "BRANCH_MANAGER" : "OWNER",
      status: "ACTIVE",
      scanToken: token("scan_qa"),
      scanStatus: "ACTIVE",
    },
  });

  const historicalStamps = scenario.historicalStamps ?? scenario.progress;
  for (let stampIndex = 0; stampIndex < historicalStamps; stampIndex += 1) {
    await prisma.stampTransaction.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        customerProgramMembershipId: programMembership.id,
        issuedByUserId: staff.id,
        quantity: 1,
        reason: `Full QA ${scenario.label} stamp ${stampIndex + 1}`,
        source: "QR_SCAN",
        idempotencyKey: `${seed.key}-${customerIndex + 1}-stamp-${stampIndex + 1}`,
        createdAt: addDays(new Date(), -Math.max(historicalStamps - stampIndex, 1)),
      },
    });
  }

  for (let redemptionIndex = 0; redemptionIndex < (scenario.redemptions ?? 0); redemptionIndex += 1) {
    await prisma.rewardRedemption.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        customerProgramMembershipId: programMembership.id,
        loyaltyProgramId: program.id,
        rewardName: program.rewardName,
        requiredStamps: program.requiredStamps,
        redeemedByUserId: staff.id,
        redeemedAt: addDays(new Date(), -redemptionIndex - 1),
        idempotencyKey: `${seed.key}-${customerIndex + 1}-redemption-${redemptionIndex + 1}`,
        notes: `Full QA ${scenario.label}.`,
      },
    });
  }

  await prisma.engagementEvent.create({ data: { businessId: business.id, customerId: membership.id, eventType: "WELCOME_CUSTOMER", eventDate: membership.joinedAt, status: "ACTIVE", metadata: { source: "full-qa-seed", scenario: scenario.label } } });
  if (scenario.progress >= 9) await prisma.engagementEvent.create({ data: { businessId: business.id, customerId: membership.id, eventType: scenario.progress >= 10 ? "REWARD_READY" : "NEAR_REWARD", eventDate: new Date(), status: "ACTIVE", metadata: { source: "full-qa-seed" } } });
  if (scenario.progress >= 10) await prisma.customerNotification.create({ data: { businessId: business.id, businessCustomerMembershipId: membership.id, notificationType: "REWARD_AVAILABLE", channel: "WHATSAPP", title: "Reward Available", messageBody: `${program.rewardName} is ready.`, deliveryStatus: "READY", metadata: { source: "full-qa-seed" } } });
  if (customerIndex < 12) await prisma.scanEvent.create({ data: { businessId: business.id, branchId: branch.id, scannedByUserId: staff.id, customerProgramMembershipId: programMembership.id, scanToken: programMembership.scanToken, result: "VALID" } });

  if (customerIndex % 10 === 9 || customerIndex === 49) logStep("createCustomer: batch completed", { business: seed.name, customerIndex });
  return { membership, globalCustomer, programMembership, scenario, branch, staff };
}

async function createBusiness(seed, seedIndex, passwordHash, plans, admin) {
  logStep("createBusiness: starting", { business: seed.name });
  logStep("createBusiness: creating business", { business: seed.name });
  const business = await prisma.business.create({ data: { name: seed.name, businessType: seed.businessType, status: "ACTIVE", supportAccessPolicy: seedIndex % 3 === 0 ? "APPROVAL_REQUIRED" : "IMMEDIATE" } });
  logStep("createBusiness: business created", { business: seed.name, id: business.id });
  logStep("createBusiness: creating business settings", { business: seed.name });
  await prisma.businessBranding.create({ data: { businessId: business.id, ...seed.branding } });
  await prisma.customerTierSetting.create({ data: { businessId: business.id, criteria: "VISITS_ONLY", tierQualificationWindow: "DAYS_90", tierMaintenanceMode: "DYNAMIC", silverVisitRequirement: 5, goldVisitRequirement: 15, vipVisitRequirement: 30 } });
  await prisma.businessScannerSettings.create({ data: { businessId: business.id, soundEffectsEnabled: true } });
  await prisma.businessCommunicationSettings.create({ data: { businessId: business.id, whatsappEnabled: false, smsEnabled: false, emailEnabled: false, preferredDefaultChannel: "NONE" } });
  logStep("createBusiness: business settings created", { business: seed.name });

  const branches = [];
  logStep("createBusiness: creating branches", { business: seed.name, count: seed.branches.length });
  for (const branchSeed of seed.branches) branches.push(await prisma.branch.create({ data: { businessId: business.id, ...branchSeed, status: "ACTIVE" } }));
  logStep("createBusiness: branches created", { business: seed.name, count: branches.length });

  logStep("createBusiness: creating users", { business: seed.name });
  const owner = await createUser({ name: `${seed.name} Owner`, email: email(seed, "owner"), role: "BUSINESS_OWNER", passwordHash, businessId: business.id, branchId: branches[0].id });
  const manager = await createUser({ name: `${seed.name} Branch Manager`, email: email(seed, "manager"), role: "BRANCH_MANAGER", passwordHash, businessId: business.id, branchId: branches[0].id });
  const staffUsers = [];
  for (let staffIndex = 1; staffIndex <= 4; staffIndex += 1) {
    const branch = branches[(staffIndex - 1) % branches.length];
    staffUsers.push(await createUser({ name: `${seed.name} Staff ${staffIndex}`, email: email(seed, `staff${staffIndex}`), role: "STAFF", passwordHash, businessId: business.id, branchId: branch.id }));
  }
  logStep("createBusiness: users created", { business: seed.name, count: staffUsers.length + 2 });

  const programs = [];
  logStep("createBusiness: creating programs", { business: seed.name, count: seed.programs.length });
  for (const programSeed of seed.programs) {
    programs.push(await prisma.loyaltyProgram.create({
      data: { businessId: business.id, businessType: seed.businessType, requiredStamps: REQUIRED_STAMPS, startingBonusStamps: 0, startingStampPolicy: "NEVER", referralRewardBonusStamps: 1, active: true, ...programSeed },
    }));
  }
  logStep("createBusiness: programs created", { business: seed.name, count: programs.length });

  logStep("createBusiness: creating subscription and preset", { business: seed.name });
  const subscription = await prisma.businessSubscription.create({ data: { businessId: business.id, subscriptionPlanId: plans[seed.planCode].id, status: "ACTIVE", billingCycle: seed.planCode === "STARTER" ? "MONTHLY" : "YEARLY", startDate: addDays(new Date(), -20), expiryDate: addDays(new Date(), seed.planCode === "STARTER" ? 10 : 345), renewalDate: addDays(new Date(), seed.planCode === "STARTER" ? 10 : 345) } });
  await prisma.subscriptionAuditLog.create({ data: { businessId: business.id, businessSubscriptionId: subscription.id, userId: admin.id, action: "STATUS_CHANGED", newValue: "ACTIVE" } });
  await prisma.businessDesignPreset.create({ data: { businessId: business.id, name: "Full QA Baseline", cardDesign: seed.programs[0].cardDesign } });
  logStep("createBusiness: subscription and preset created", { business: seed.name });

  const customers = [];
  logStep("createBusiness: creating customers", { business: seed.name, count: 50 });
  for (let customerIndex = 0; customerIndex < 50; customerIndex += 1) customers.push(await createCustomer({ seed, seedIndex, customerIndex, business, branches, owner, staffUsers, programs }));
  logStep("createBusiness: customers created", { business: seed.name, count: customers.length });

  logStep("createBusiness: creating referrals", { business: seed.name });
  await createReferrals(seed, business, customers, programs[0]);
  logStep("createBusiness: referrals created", { business: seed.name });
  logStep("createBusiness: creating activity alert", { business: seed.name });
  await createActivityAlert(seed, business, branches[0], staffUsers[0], customers[9].programMembership);
  logStep("createBusiness: activity alert created", { business: seed.name });
  logStep("createBusiness: creating support records", { business: seed.name });
  await createSupportRecords(seedIndex, business, admin);
  logStep("createBusiness: support records created", { business: seed.name });
  logStep("createBusiness: creating audit events", { business: seed.name });
  await prisma.auditEvent.createMany({
    data: [
      { actorUserId: owner.id, businessId: business.id, branchId: branches[0].id, action: "FULL_QA_BUSINESS_CREATED", entityType: "Business", entityId: String(business.id), metadata: { source: "full-qa-seed" } },
      { actorUserId: staffUsers[0].id, businessId: business.id, branchId: branches[0].id, action: "FULL_QA_CUSTOMERS_CREATED", entityType: "BusinessCustomerMembership", entityId: String(customers[0].membership.id), metadata: { source: "full-qa-seed", count: customers.length } },
    ],
  });
  logStep("createBusiness: audit events created", { business: seed.name });

  logStep("createBusiness: completed", { business: seed.name });
  return { business, branches, owner, manager, staffUsers, programs, customers };
}

async function createActivityAlert(seed, business, branch, staff, programMembership) {
  logStep("createActivityAlert: create alert starting", { business: business.name });
  const alert = await prisma.activityAlert.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      userId: staff.id,
      customerProgramMembershipId: programMembership.id,
      alertType: "QA_NEAR_REWARD_REVIEW",
      severity: "LOW",
      priority: "LOW",
      riskScore: 12,
      dedupeKey: `${seed.key}:qa-near-reward`,
      firstDetectedAt: new Date(),
      lastDetectedAt: new Date(),
      description: `Full QA alert for ${business.name}: customer is close to a reward.`,
      status: "OPEN",
    },
  });
  logStep("createActivityAlert: create alert completed", { business: business.name, alertId: alert.id });
  logStep("createActivityAlert: create alert event starting", { business: business.name });
  await prisma.alertEvent.create({
    data: {
      alertId: alert.id,
      businessId: business.id,
      actorUserId: staff.id,
      eventType: "ALERT_CREATED",
      metadata: { source: "full-qa-seed" },
    },
  });
  logStep("createActivityAlert: create alert event completed", { business: business.name });
}

async function createReferrals(seed, business, customers, program) {
  logStep("createReferrals: starting", { business: business.name });
  for (let index = 0; index < 5; index += 1) {
    logStep("createReferrals: creating referral", { business: business.name, index });
    const referrer = customers[index].membership;
    const referred = customers[index + 10].membership;
    const firstStamp = await prisma.stampTransaction.findFirst({ where: { customerProgramMembershipId: customers[index + 10].programMembership.id }, orderBy: { createdAt: "asc" } });
    const referral = await prisma.referral.create({
      data: { businessId: business.id, referrerMembershipId: referrer.id, referredGlobalCustomerId: customers[index + 10].globalCustomer.id, referredMembershipId: referred.id, referralCode: referrer.referralCode, status: firstStamp ? "QUALIFIED" : "PENDING", source: "LINK", firstStampTransactionId: firstStamp?.id, referredFirstStampBranchId: customers[index + 10].branch.id, qualifiedAt: firstStamp ? new Date() : null },
    });
    await prisma.referralEvent.create({ data: { businessId: business.id, referralId: referral.id, eventType: firstStamp ? "REFERRAL_QUALIFIED" : "REFERRAL_CREATED", metadata: { source: "full-qa-seed" } } });
    if (firstStamp) await prisma.referralReward.create({ data: { businessId: business.id, referralId: referral.id, loyaltyProgramId: program.id, referrerProgramMembershipId: customers[index].programMembership.id, bonusStamps: 1, status: "GRANTED", grantedAt: new Date() } });
    logStep("createReferrals: referral created", { business: business.name, index, status: referral.status });
  }
  logStep("createReferrals: completed", { business: business.name });
}

async function createSupportRecords(index, business, admin) {
  logStep("createSupportRecords: create request starting", { business: business.name });
  const request = await prisma.supportRequest.create({ data: { businessId: business.id, requestedByUserId: admin.id, reason: `Full QA support request for ${business.name}`, durationMinutes: 30, readOnly: true, emergency: index % 4 === 0, status: index % 2 === 0 ? "PENDING" : "APPROVED", expiresAt: addDays(new Date(), 1), reviewedByUserId: index % 2 === 0 ? null : admin.id, reviewedAt: index % 2 === 0 ? null : new Date(), responseNote: index % 2 === 0 ? null : "Approved for QA testing." } });
  logStep("createSupportRecords: create request completed", { business: business.name, requestId: request.id, status: request.status });
  logStep("createSupportRecords: create session starting", { business: business.name });
  const session = await prisma.supportSession.create({ data: { businessId: business.id, adminUserId: admin.id, reason: `QA support visibility for ${business.name}`, expiresAt: addDays(new Date(), 1), readOnly: true, status: "ENDED", endedAt: new Date(), supportSummary: "QA support session completed.", supportRequestId: request.status === "APPROVED" ? request.id : null } });
  logStep("createSupportRecords: create session completed", { business: business.name, sessionId: session.id });
  logStep("createSupportRecords: create activity starting", { business: business.name });
  await prisma.supportSessionActivity.create({ data: { supportSessionId: session.id, adminUserId: admin.id, businessId: business.id, activityType: "SESSION_STARTED", path: "/dashboard", description: "QA support session started." } });
  logStep("createSupportRecords: create activity completed", { business: business.name });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCredentials(rows) {
  logStep("writeCredentials: starting", { rowCount: rows.length });
  const filePath = join(process.cwd(), "qa-credentials.csv");
  const header = ["Business name", "Role", "Full name", "Email", "Password", "Branch", "Notes"];
  const csv = [header, ...rows.map((row) => [row.business, row.role, row.name, row.email, row.password, row.branch, row.notes])].map((row) => row.map(csvEscape).join(",")).join("\n");
  writeFileSync(filePath, csv, "utf8");
  logStep("writeCredentials: completed", { filePath });
  return filePath;
}

async function main() {
  logStep("main: safety guard starting");
  const target = assertSafeTarget();
  logStep("main: safety guard completed", { database: target.databaseName, host: target.host });
  console.warn(WARNING);
  console.warn(`Target database: ${target.maskedUrl}`);

  logStep("main: database connection check starting");
  await prisma.$queryRaw`SELECT 1 AS ok`;
  logStep("main: database connection check completed");
  logStep("main: full wipe starting");
  const tableCount = await fullWipe();
  logStep("main: full wipe completed", { tableCount });
  logStep("main: password hash starting");
  const passwordHash = await bcrypt.hash(QA_PASSWORD, 12);
  logStep("main: password hash completed");
  logStep("main: plan creation starting");
  const plans = await ensurePlans();
  logStep("main: plan creation completed");
  logStep("main: platform setting creation starting");
  await prisma.platformSetting.create({ data: { key: "demo_mode", value: { enabled: false, source: "full-qa-seed" } } });
  logStep("main: platform setting creation completed");
  logStep("main: system admin creation starting");
  const admin = await createUser({ name: "LoyaltyBase QA System Administrator", email: "admin@loyaltybase.test", role: "PLATFORM_OWNER", passwordHash });
  logStep("main: system admin creation completed", { id: admin.id, email: admin.email });
  const credentialRows = [{ business: "LoyaltyBase", role: "System Admin", name: admin.name, email: admin.email, password: QA_PASSWORD, branch: "-", notes: "Can see all QA businesses." }];

  const created = [];
  for (const [index, businessSeed] of businesses.entries()) {
    logStep("main: business seed starting", { index: index + 1, total: businesses.length, business: businessSeed.name });
    const entry = await createBusiness(businessSeed, index, passwordHash, plans, admin);
    logStep("main: business seed completed", { index: index + 1, total: businesses.length, business: businessSeed.name });
    created.push(entry);
    credentialRows.push(
      { business: entry.business.name, role: "Business Owner", name: entry.owner.name, email: entry.owner.email, password: QA_PASSWORD, branch: entry.branches[0].name, notes: "Owner can see only this business." },
      { business: entry.business.name, role: "Branch Manager", name: entry.manager.name, email: entry.manager.email, password: QA_PASSWORD, branch: entry.branches[0].name, notes: "Branch-scoped manager." },
      ...entry.staffUsers.map((staff) => ({ business: entry.business.name, role: "Staff", name: staff.name, email: staff.email, password: QA_PASSWORD, branch: entry.branches.find((branch) => branch.id === staff.branchId)?.name ?? "-", notes: "Branch-scoped staff account." })),
    );
  }

  logStep("main: credential CSV generation starting");
  const credentialsPath = writeCredentials(credentialRows);
  logStep("main: credential CSV generation completed", { credentialsPath });
  console.log("");
  console.log("Full QA seed completed.");
  console.log(`Database: ${target.databaseName} @ ${target.host}`);
  console.log(`Tables wiped: ${tableCount}`);
  console.log(`Businesses created: ${created.length}`);
  console.log(`Users created: ${credentialRows.length}`);
  console.log(`Customers created: ${created.reduce((sum, entry) => sum + entry.customers.length, 0)}`);
  console.log(`Programs created: ${created.reduce((sum, entry) => sum + entry.programs.length, 0)}`);
  console.log(`Credentials sheet: ${credentialsPath}`);
  console.log("");
  console.table(credentialRows);
  console.log("Shared-phone tenant isolation cases:");
  console.table([
    { phone: "+971501111111", business: "Emirates Coffee House", customer: "Ahmed Ali" },
    { phone: "+971501111111", business: "Royal Barbers", customer: "Ahmed" },
    { phone: "+971501111111", business: "Glow Beauty Lounge", customer: "Mr Ahmed" },
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
