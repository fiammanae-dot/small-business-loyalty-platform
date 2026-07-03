/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const nextEnv = require("@next/env");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

nextEnv.loadEnvConfig(process.cwd());

const REQUIRED_CONFIRMATION = "Loyalty Card UAE_MANUAL_AUDIT";
const FORBIDDEN_DATABASES = new Set(["loyalty_platform_pilot"]);

const subscriptionPlans = [
  { code: "STARTER", name: "Starter", maxBranches: 1, maxLoyaltyPrograms: 1, monthlyPrice: "100.00", annualPrice: "1000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
  { code: "GROWTH", name: "Growth", maxBranches: 3, maxLoyaltyPrograms: 5, monthlyPrice: "200.00", annualPrice: "2000.00", billingCycleSupport: ["MONTHLY", "YEARLY"] },
  { code: "MULTI_BRANCH", name: "Multi Branch", maxBranches: 10, maxLoyaltyPrograms: 15, monthlyPrice: "0.00", annualPrice: "1000.00", billingCycleSupport: ["YEARLY"] },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for manual audit seeding.`);
  return value;
}

function assertSafeManualAuditTarget() {
  const confirmation = process.env.MANUAL_AUDIT_SEED_CONFIRM?.trim();
  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`Refusing to run manual audit seed. Set MANUAL_AUDIT_SEED_CONFIRM=${REQUIRED_CONFIRMATION} to confirm this is a manual QA database.`);
  }

  const databaseUrl = requireEnv("DATABASE_URL");
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");

  if (FORBIDDEN_DATABASES.has(databaseName)) {
    throw new Error(`Refusing to seed protected database "${databaseName}". Manual audit seed is not allowed on pilot databases.`);
  }

  if (process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run manual audit seed in a production environment.");
  }

  return databaseName;
}

function token(prefix) {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

function normalizePhone(phone) {
  let normalized = phone.trim().replace(/[\s\-()]/g, "");
  if (normalized.startsWith("05")) normalized = `+971${normalized.slice(1)}`;
  if (normalized.startsWith("971")) normalized = `+${normalized}`;
  if (normalized.startsWith("00971")) normalized = `+971${normalized.slice(5)}`;
  return normalized;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function qaEmail(localPart) {
  return `${localPart}@manual-audit.Loyalty Card UAE.test`;
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

async function ensureUser({ email, name, role, passwordHash, businessId = null, branchId = null }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role,
      businessId,
      branchId,
      status: "ACTIVE",
      forcePasswordChange: false,
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

async function ensureBusiness(seed) {
  const business = await prisma.business.upsert({
    where: { uuid: seed.uuid },
    update: { name: seed.name, businessType: seed.businessType, status: "ACTIVE" },
    create: { uuid: seed.uuid, name: seed.name, businessType: seed.businessType, status: "ACTIVE" },
  });

  await prisma.businessBranding.upsert({
    where: { businessId: business.id },
    update: seed.branding,
    create: { businessId: business.id, ...seed.branding },
  });

  await prisma.customerTierSetting.upsert({
    where: { businessId: business.id },
    update: {
      criteria: "VISITS_ONLY",
      tierQualificationWindow: "DAYS_90",
      tierMaintenanceMode: "DYNAMIC",
      silverVisitRequirement: 5,
      goldVisitRequirement: 15,
      vipVisitRequirement: 30,
    },
    create: {
      businessId: business.id,
      criteria: "VISITS_ONLY",
      tierQualificationWindow: "DAYS_90",
      tierMaintenanceMode: "DYNAMIC",
      silverVisitRequirement: 5,
      goldVisitRequirement: 15,
      vipVisitRequirement: 30,
    },
  });

  await prisma.businessScannerSettings.upsert({
    where: { businessId: business.id },
    update: { soundEffectsEnabled: true },
    create: { businessId: business.id, soundEffectsEnabled: true },
  });

  return business;
}

async function ensureBranch(seed, businessId) {
  return prisma.branch.upsert({
    where: { uuid: seed.uuid },
    update: { businessId, name: seed.name, country: seed.country, city: seed.city, address: seed.address, status: "ACTIVE" },
    create: { ...seed, businessId, status: "ACTIVE" },
  });
}

async function ensureProgram(seed, businessId) {
  return prisma.loyaltyProgram.upsert({
    where: { uuid: seed.uuid },
    update: {
      businessId,
      name: seed.name,
      businessType: seed.businessType,
      productOrServiceName: seed.productOrServiceName,
      description: seed.description,
      requiredStamps: seed.requiredStamps,
      startingBonusStamps: seed.startingBonusStamps ?? 0,
      rewardName: seed.rewardName,
      rewardDescription: seed.rewardDescription,
      referralRewardBonusStamps: seed.referralRewardBonusStamps ?? 1,
      active: seed.active,
    },
    create: { ...seed, businessId },
  });
}

async function ensureCustomer(seed, context) {
  const normalizedPhone = normalizePhone(seed.phone);
  const globalCustomer = await prisma.globalCustomer.upsert({
    where: { normalizedPhone },
    update: { firstName: seed.firstName, lastName: seed.lastName, phone: seed.phone, email: seed.email ?? null },
    create: { firstName: seed.firstName, lastName: seed.lastName, phone: seed.phone, normalizedPhone, email: seed.email ?? null },
  });

  const existingMembership = await prisma.businessCustomerMembership.findUnique({
    where: { businessId_globalCustomerId: { businessId: context.business.id, globalCustomerId: globalCustomer.id } },
    select: { id: true, cardToken: true },
  });

  const membershipData = {
    createdBranchId: context.branch.id,
    createdByUserId: context.owner.id,
    marketingConsent: true,
    source: seed.source ?? "OWNER",
    status: "ACTIVE",
    cardStatus: "ACTIVE",
    referralCode: seed.referralCode,
    referralEnabled: true,
    currentTier: seed.currentTier,
    tierUpdatedAt: new Date(),
    notes: seed.notes,
  };

  const membership = existingMembership
    ? await prisma.businessCustomerMembership.update({ where: { id: existingMembership.id }, data: membershipData })
    : await prisma.businessCustomerMembership.create({
        data: {
          ...(seed.membershipUuid ? { uuid: seed.membershipUuid } : {}),
          globalCustomerId: globalCustomer.id,
          businessId: context.business.id,
          cardToken: seed.cardToken ?? token("cst_qa"),
          cardCreatedAt: new Date(),
          ...membershipData,
        },
      });

  return { globalCustomer, membership };
}

async function ensureProgramMembership({ uuid, membership, program, earnedStamps, bonusStamps = 0, status = "ACTIVE" }) {
  const existing = await prisma.customerProgramMembership.findUnique({
    where: { businessCustomerMembershipId_loyaltyProgramId: { businessCustomerMembershipId: membership.id, loyaltyProgramId: program.id } },
    select: { id: true },
  });

  const data = {
    earnedStamps,
    bonusStamps,
    enrollmentSource: "OWNER",
    status,
    scanStatus: "ACTIVE",
  };

  return existing
    ? prisma.customerProgramMembership.update({ where: { id: existing.id }, data })
    : prisma.customerProgramMembership.create({
        data: {
          ...(uuid ? { uuid } : {}),
          businessCustomerMembershipId: membership.id,
          loyaltyProgramId: program.id,
          scanToken: token("scan_qa"),
          scanCreatedAt: new Date(),
          ...data,
        },
      });
}

async function ensureSubscription({ business, plan, status, billingCycle, startDate, trialStartDate = null, trialEndDate = null, expiryDate }) {
  const existing = await prisma.businessSubscription.findFirst({ where: { businessId: business.id, status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } });
  const data = { subscriptionPlanId: plan.id, status, billingCycle, startDate, trialStartDate, trialEndDate, expiryDate, renewalDate: expiryDate, endDate: null };
  return existing
    ? prisma.businessSubscription.update({ where: { id: existing.id }, data })
    : prisma.businessSubscription.create({ data: { businessId: business.id, ...data } });
}

async function ensureInvoice({ business, subscription, admin, invoiceNumber, status, amount, daysOffset, dueOffset, notes }) {
  const invoiceDate = addDays(new Date(), daysOffset);
  const dueDate = addDays(new Date(), dueOffset);
  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber },
    update: { businessId: business.id, subscriptionId: subscription.id, invoiceDate, dueDate, amount, status, notes, createdByUserId: admin.id },
    create: { businessId: business.id, subscriptionId: subscription.id, invoiceNumber, invoiceDate, dueDate, amount, status, notes, createdByUserId: admin.id },
  });

  await prisma.invoiceAuditLog.create({
    data: { invoiceId: invoice.id, businessId: business.id, userId: admin.id, action: "MANUAL_AUDIT_SEED", previousStatus: null, newStatus: status, notes: "Manual audit invoice example." },
  }).catch(() => null);

  if (status === "PAID") {
    const existingPayment = await prisma.payment.findFirst({ where: { invoiceId: invoice.id, paymentReference: `QA-${invoiceNumber}` }, select: { id: true } });
    if (!existingPayment) {
      await prisma.payment.create({
        data: { businessId: business.id, invoiceId: invoice.id, amount, currency: "AED", paymentMethod: "BANK_TRANSFER", paymentReference: `QA-${invoiceNumber}`, paidAt: addDays(new Date(), daysOffset + 2), recordedByUserId: admin.id, notes: "Manual audit paid invoice example." },
      });
    }
  }

  return invoice;
}

async function ensureStamp({ business, branch, programMembership, user, quantity, reason, key }) {
  return prisma.stampTransaction.upsert({
    where: { idempotencyKey: key },
    update: { businessId: business.id, branchId: branch.id, customerProgramMembershipId: programMembership.id, issuedByUserId: user.id, quantity, reason, source: "QR_SCAN" },
    create: { businessId: business.id, branchId: branch.id, customerProgramMembershipId: programMembership.id, issuedByUserId: user.id, quantity, reason, source: "QR_SCAN", idempotencyKey: key },
  });
}

async function ensureScanEvent({ business, branch, programMembership, user, result, tokenValue }) {
  const existing = await prisma.scanEvent.findFirst({ where: { businessId: business.id, scanToken: tokenValue, result }, select: { id: true } });
  if (existing) return existing;
  return prisma.scanEvent.create({ data: { businessId: business.id, branchId: branch.id, scannedByUserId: user.id, customerProgramMembershipId: programMembership?.id, scanToken: tokenValue, result } });
}

async function ensureRewardRedemption({ business, branch, programMembership, program, user, key }) {
  return prisma.rewardRedemption.upsert({
    where: { idempotencyKey: key },
    update: { businessId: business.id, branchId: branch.id, customerProgramMembershipId: programMembership.id, loyaltyProgramId: program.id, rewardName: program.rewardName, requiredStamps: program.requiredStamps, redeemedByUserId: user.id, redeemedAt: new Date(), notes: "Manual audit reward redemption." },
    create: { businessId: business.id, branchId: branch.id, customerProgramMembershipId: programMembership.id, loyaltyProgramId: program.id, rewardName: program.rewardName, requiredStamps: program.requiredStamps, redeemedByUserId: user.id, redeemedAt: new Date(), idempotencyKey: key, notes: "Manual audit reward redemption." },
  });
}

async function ensureAlert({ business, branch, user, programMembership, alertType, severity, description, dedupeKey }) {
  const existing = await prisma.activityAlert.findFirst({ where: { businessId: business.id, dedupeKey }, select: { id: true } });
  const data = { branchId: branch.id, userId: user.id, customerProgramMembershipId: programMembership.id, alertType, severity, priority: severity, riskScore: severity === "HIGH" ? 82 : 45, dedupeKey, occurrenceCount: 3, firstDetectedAt: addDays(new Date(), -1), lastDetectedAt: new Date(), description, status: severity === "HIGH" ? "ESCALATED" : "OPEN", escalatedAt: severity === "HIGH" ? new Date() : null, escalationReason: severity === "HIGH" ? "Manual audit high-risk scenario." : null };
  const alert = existing ? await prisma.activityAlert.update({ where: { id: existing.id }, data }) : await prisma.activityAlert.create({ data: { businessId: business.id, ...data } });
  const existingEvent = await prisma.alertEvent.findFirst({ where: { alertId: alert.id, eventType: "ALERT_CREATED" }, select: { id: true } });
  if (!existingEvent) await prisma.alertEvent.create({ data: { alertId: alert.id, businessId: business.id, actorUserId: user.id, eventType: "ALERT_CREATED", metadata: { source: "manual-audit-seed" } } });
  return alert;
}

async function ensureAuditEvent(data) {
  const existing = await prisma.auditEvent.findFirst({ where: { action: data.action, entityType: data.entityType, entityId: data.entityId }, select: { id: true } });
  if (existing) return existing;
  return prisma.auditEvent.create({ data });
}

async function ensureReferral({ business, referrer, referred, referredGlobalCustomer, program, referrerProgramMembership, firstStampTransaction, branch }) {
  const referral = await prisma.referral.upsert({
    where: { uuid: `00000000-0000-4000-9000-${String(business.id).padStart(12, "0")}` },
    update: { businessId: business.id, referrerMembershipId: referrer.id, referredGlobalCustomerId: referredGlobalCustomer.id, referredMembershipId: referred.id, referralCode: referrer.referralCode, status: "QUALIFIED", firstStampTransactionId: firstStampTransaction.id, referredFirstStampBranchId: branch.id, qualifiedAt: new Date(), source: "LINK" },
    create: { uuid: `00000000-0000-4000-9000-${String(business.id).padStart(12, "0")}`, businessId: business.id, referrerMembershipId: referrer.id, referredGlobalCustomerId: referredGlobalCustomer.id, referredMembershipId: referred.id, referralCode: referrer.referralCode, status: "QUALIFIED", firstStampTransactionId: firstStampTransaction.id, referredFirstStampBranchId: branch.id, qualifiedAt: new Date(), source: "LINK" },
  });

  await prisma.referralReward.upsert({
    where: { referralId_loyaltyProgramId: { referralId: referral.id, loyaltyProgramId: program.id } },
    update: { businessId: business.id, referrerProgramMembershipId: referrerProgramMembership.id, bonusStamps: 1, status: "GRANTED", grantedAt: new Date() },
    create: { businessId: business.id, referralId: referral.id, loyaltyProgramId: program.id, referrerProgramMembershipId: referrerProgramMembership.id, bonusStamps: 1, status: "GRANTED", grantedAt: new Date() },
  });

  const existingEvent = await prisma.referralEvent.findFirst({ where: { referralId: referral.id, eventType: "REFERRAL_QUALIFIED" }, select: { id: true } });
  if (!existingEvent) await prisma.referralEvent.create({ data: { businessId: business.id, referralId: referral.id, eventType: "REFERRAL_QUALIFIED", metadata: { source: "manual-audit-seed" } } });

  return referral;
}

async function ensureNotification({ business, membership, notificationType, title, messageBody }) {
  const existing = await prisma.customerNotification.findFirst({ where: { businessId: business.id, businessCustomerMembershipId: membership.id, notificationType, title }, select: { id: true } });
  if (existing) return existing;
  return prisma.customerNotification.create({ data: { businessId: business.id, businessCustomerMembershipId: membership.id, notificationType, channel: "WHATSAPP", title, messageBody, deliveryStatus: "READY", metadata: { source: "manual-audit-seed" } } });
}

async function main() {
  const databaseName = assertSafeManualAuditTarget();
  const password = requireEnv("MANUAL_AUDIT_SEED_PASSWORD");
  const adminEmail = process.env.MANUAL_AUDIT_ADMIN_EMAIL?.trim() || qaEmail("system.admin");
  const passwordHash = await bcrypt.hash(password, 12);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  const plans = await ensurePlans();
  const admin = await ensureUser({ email: adminEmail, name: "Manual Audit System Administrator", role: "PLATFORM_OWNER", passwordHash });

  await prisma.platformSetting.upsert({ where: { key: "demo_mode" }, update: { value: { enabled: true, source: "manual-audit-seed" } }, create: { key: "demo_mode", value: { enabled: true, source: "manual-audit-seed" } } });

  const businessSeeds = [
    {
      uuid: "90000000-0000-4000-9000-000000000001",
      name: "Manual Audit Coffee House",
      type: "coffee",
      businessType: "COFFEE_SHOP",
      planCode: "STARTER",
      subscriptionStatus: "ACTIVE",
      billingCycle: "MONTHLY",
      branding: { primaryColor: "#F97316", secondaryColor: "#FDBA74", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#F97316" },
      branches: [{ uuid: "90000000-1000-4000-9000-000000000001", name: "Jumeirah Coffee Bar", country: "United Arab Emirates", city: "Dubai", address: "Jumeirah Beach Road" }],
      programs: [
        { uuid: "90000000-2000-4000-9000-000000000001", name: "Coffee Club", businessType: "COFFEE_SHOP", productOrServiceName: "Coffee", description: "Buy coffees and earn a free drink.", requiredStamps: 10, startingBonusStamps: 0, rewardName: "Free Coffee", rewardDescription: "Redeem one free house coffee.", active: true },
        { uuid: "90000000-2000-4000-9000-000000000002", name: "Seasonal Pastry Card", businessType: "COFFEE_SHOP", productOrServiceName: "Pastry", description: "Inactive manual audit program.", requiredStamps: 6, startingBonusStamps: 0, rewardName: "Free Pastry", rewardDescription: "Redeem one pastry.", active: false },
      ],
    },
    {
      uuid: "90000000-0000-4000-9000-000000000002",
      name: "Manual Audit Gulf Bistro",
      type: "restaurant",
      businessType: "RESTAURANT",
      planCode: "GROWTH",
      subscriptionStatus: "TRIAL",
      billingCycle: "YEARLY",
      branding: { primaryColor: "#0066FF", secondaryColor: "#00C853", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#7B1FA2" },
      branches: [
        { uuid: "90000000-1000-4000-9000-000000000011", name: "Downtown Dining Room", country: "United Arab Emirates", city: "Dubai", address: "Downtown Boulevard" },
        { uuid: "90000000-1000-4000-9000-000000000012", name: "Marina Terrace", country: "United Arab Emirates", city: "Dubai", address: "Dubai Marina Walk" },
        { uuid: "90000000-1000-4000-9000-000000000013", name: "Al Khan Grill", country: "United Arab Emirates", city: "Sharjah", address: "Al Khan Corniche" },
      ],
      programs: [
        { uuid: "90000000-2000-4000-9000-000000000011", name: "Lunch Loyalty", businessType: "RESTAURANT", productOrServiceName: "Lunch", description: "Earn rewards on lunch visits.", requiredStamps: 8, startingBonusStamps: 1, rewardName: "Free Main Course", rewardDescription: "Redeem one selected main course.", active: true },
        { uuid: "90000000-2000-4000-9000-000000000012", name: "Family Dinner Club", businessType: "RESTAURANT", productOrServiceName: "Dinner", description: "Multi-program scanner selection test.", requiredStamps: 12, startingBonusStamps: 0, rewardName: "Dessert Platter", rewardDescription: "Redeem one family dessert platter.", active: true },
      ],
    },
    {
      uuid: "90000000-0000-4000-9000-000000000003",
      name: "Manual Audit Shine Car Wash",
      type: "carwash",
      businessType: "CAR_CARE_CENTER",
      planCode: "MULTI_BRANCH",
      subscriptionStatus: "ACTIVE",
      billingCycle: "YEARLY",
      branding: { primaryColor: "#0F766E", secondaryColor: "#99F6E4", backgroundColor: "#FFFFFF", textColor: "#111827", buttonColor: "#0F766E" },
      branches: [
        { uuid: "90000000-1000-4000-9000-000000000021", name: "Mussafah Wash Bay", country: "United Arab Emirates", city: "Abu Dhabi", address: "Mussafah Industrial" },
        { uuid: "90000000-1000-4000-9000-000000000022", name: "Al Quoz Detail Center", country: "United Arab Emirates", city: "Dubai", address: "Al Quoz 3" },
        { uuid: "90000000-1000-4000-9000-000000000023", name: "Ajman Express Wash", country: "United Arab Emirates", city: "Ajman", address: "Sheikh Ammar Road" },
        { uuid: "90000000-1000-4000-9000-000000000024", name: "Ras Al Khaimah Auto Spa", country: "United Arab Emirates", city: "Ras Al Khaimah", address: "Corniche Road" },
      ],
      programs: [
        { uuid: "90000000-2000-4000-9000-000000000021", name: "Wash Rewards", businessType: "CAR_CARE_CENTER", productOrServiceName: "Car Wash", description: "Earn a free exterior wash.", requiredStamps: 5, startingBonusStamps: 0, rewardName: "Free Wash", rewardDescription: "Redeem one exterior wash.", active: true },
      ],
    },
  ];

  const created = { businesses: [], accounts: [], cards: [] };

  for (const seed of businessSeeds) {
    const business = await ensureBusiness(seed);
    const branches = [];
    for (const branchSeed of seed.branches) branches.push(await ensureBranch(branchSeed, business.id));

    const owner = await ensureUser({ email: qaEmail(`${seed.type}.owner`), name: `${seed.name} Owner`, role: "BUSINESS_OWNER", passwordHash, businessId: business.id, branchId: branches[0].id });
    const manager = await ensureUser({ email: qaEmail(`${seed.type}.manager`), name: `${seed.name} Branch Manager`, role: "BRANCH_MANAGER", passwordHash, businessId: business.id, branchId: branches[0].id });
    const staff = await ensureUser({ email: qaEmail(`${seed.type}.staff`), name: `${seed.name} Staff`, role: "STAFF", passwordHash, businessId: business.id, branchId: branches[0].id });

    created.accounts.push(owner.email, manager.email, staff.email);

    const programs = [];
    for (const programSeed of seed.programs) programs.push(await ensureProgram(programSeed, business.id));

    const subscription = await ensureSubscription({
      business,
      plan: plans[seed.planCode],
      status: seed.subscriptionStatus,
      billingCycle: seed.billingCycle,
      startDate: addDays(new Date(), -30),
      trialStartDate: seed.subscriptionStatus === "TRIAL" ? addDays(new Date(), -5) : null,
      trialEndDate: seed.subscriptionStatus === "TRIAL" ? addDays(new Date(), 9) : null,
      expiryDate: addDays(new Date(), seed.billingCycle === "YEARLY" ? 335 : 30),
    });

    await prisma.subscriptionAuditLog.create({ data: { businessId: business.id, businessSubscriptionId: subscription.id, userId: admin.id, action: seed.subscriptionStatus === "TRIAL" ? "TRIAL_ACTIVATED" : "STATUS_CHANGED", newValue: seed.subscriptionStatus } }).catch(() => null);

    const invoicePrefix = seed.type.toUpperCase();
    await ensureInvoice({ business, subscription, admin, invoiceNumber: `QA-${invoicePrefix}-PAID-001`, status: "PAID", amount: seed.planCode === "MULTI_BRANCH" ? "4000.00" : seed.planCode === "GROWTH" ? "2000.00" : "100.00", daysOffset: -20, dueOffset: -10, notes: "Manual audit paid invoice." });
    await ensureInvoice({ business, subscription, admin, invoiceNumber: `QA-${invoicePrefix}-UNPAID-001`, status: "ISSUED", amount: seed.planCode === "MULTI_BRANCH" ? "1000.00" : "200.00", daysOffset: -3, dueOffset: 12, notes: "Manual audit unpaid invoice." });
    if (seed.type === "restaurant") await ensureInvoice({ business, subscription, admin, invoiceNumber: `QA-${invoicePrefix}-OVERDUE-001`, status: "OVERDUE", amount: "200.00", daysOffset: -45, dueOffset: -15, notes: "Manual audit overdue invoice." });

    const customerSeeds = [
      { firstName: "Mina", lastName: "Active", phone: `+97150${business.id}00001`, referralCode: `${seed.name.slice(13, 16).toUpperCase()}-MINA21`, currentTier: "SILVER", earned: 3, notes: "Active customer with partial progress." },
      { firstName: "Noura", lastName: "New", phone: `+97150${business.id}00002`, referralCode: `${seed.name.slice(13, 16).toUpperCase()}-NOURA14`, currentTier: "BRONZE", earned: 0, notes: "New customer with no stamps." },
      { firstName: "Omar", lastName: "NearReward", phone: `+97150${business.id}00003`, referralCode: `${seed.name.slice(13, 16).toUpperCase()}-OMAR55`, currentTier: "GOLD", earned: Math.max(programs[0].requiredStamps - 1, 0), notes: "Customer close to reward." },
      { firstName: "Sara", lastName: "RewardReady", phone: `+97150${business.id}00004`, referralCode: `${seed.name.slice(13, 16).toUpperCase()}-SARA17`, currentTier: "VIP", earned: programs[0].requiredStamps, notes: "Customer ready for reward." },
      { firstName: "Ahmed", lastName: "Shared", phone: "+971509999001", referralCode: `${seed.name.slice(13, 16).toUpperCase()}-AHMED82`, currentTier: seed.type === "coffee" ? "BRONZE" : "GOLD", earned: 2, notes: "Same global customer across multiple businesses with business-specific referral code." },
    ];

    const customers = [];
    for (const customerSeed of customerSeeds) {
      const customer = await ensureCustomer(customerSeed, { business, branch: branches[0], owner });
      const membership = await ensureProgramMembership({ uuid: undefined, membership: customer.membership, program: programs[0], earnedStamps: customerSeed.earned, bonusStamps: 0 });
      if (seed.type === "restaurant" && customerSeed.firstName === "Mina") {
        await ensureProgramMembership({ uuid: undefined, membership: customer.membership, program: programs[1], earnedStamps: 6, bonusStamps: 0 });
      }
      customers.push({ ...customer, programMembership: membership, seed: customerSeed });
      created.cards.push(`${customerSeed.firstName} ${customerSeed.lastName}: ${baseUrl}/card/${customer.membership.cardToken}`);
    }

    const mina = customers[0];
    const nora = customers[1];
    const omar = customers[2];
    const sara = customers[3];

    const firstStamp = await ensureStamp({ business, branch: branches[0], programMembership: nora.programMembership, user: staff, quantity: 1, reason: "Manual audit first stamp after referral", key: `qa-${seed.type}-first-stamp` });
    await ensureStamp({ business, branch: branches[0], programMembership: mina.programMembership, user: staff, quantity: 2, reason: "Manual audit daily visit", key: `qa-${seed.type}-daily-visit` });
    await ensureStamp({ business, branch: branches[0], programMembership: omar.programMembership, user: manager, quantity: 1, reason: "Manual audit near reward visit", key: `qa-${seed.type}-near-reward` });

    await ensureScanEvent({ business, branch: branches[0], programMembership: mina.programMembership, user: staff, result: "VALID", tokenValue: mina.programMembership.scanToken });
    await ensureScanEvent({ business, branch: branches[0], programMembership: null, user: staff, result: "INVALID", tokenValue: `invalid-${seed.type}-qr` });
    await ensureRewardRedemption({ business, branch: branches[0], programMembership: sara.programMembership, program: programs[0], user: staff, key: `qa-${seed.type}-reward-redemption` });

    await ensureReferral({ business, referrer: mina.membership, referred: nora.membership, referredGlobalCustomer: nora.globalCustomer, program: programs[0], referrerProgramMembership: mina.programMembership, firstStampTransaction: firstStamp, branch: branches[0] });

    await ensureAlert({ business, branch: branches[0], user: staff, programMembership: omar.programMembership, alertType: "MULTIPLE_STAMPS", severity: "MEDIUM", description: "Manual audit repeated stamp pattern.", dedupeKey: `qa-${seed.type}-multiple-stamps` });
    if (seed.type === "restaurant") await ensureAlert({ business, branch: branches[1], user: manager, programMembership: sara.programMembership, alertType: "HIGH_REWARD_ACTIVITY", severity: "HIGH", description: "Manual audit high reward activity scenario.", dedupeKey: `qa-${seed.type}-high-reward` });

    await ensureNotification({ business, membership: mina.membership, notificationType: "NEW_STAMP_EARNED", title: "Stamp Earned", messageBody: "You earned a new stamp." });
    await ensureNotification({ business, membership: sara.membership, notificationType: "REWARD_AVAILABLE", title: "Reward Available", messageBody: "Your loyalty reward is ready." });

    await prisma.engagementEvent.create({ data: { businessId: business.id, customerId: mina.membership.id, eventType: "WELCOME_CUSTOMER", eventDate: new Date(), status: "ACTIVE", metadata: { source: "manual-audit-seed" } } }).catch(() => null);
    await ensureAuditEvent({ actorUserId: owner.id, businessId: business.id, branchId: branches[0].id, action: "MANUAL_AUDIT_CUSTOMER_ENROLLED", entityType: "BusinessCustomerMembership", entityId: String(mina.membership.id), metadata: { source: "manual-audit-seed" } });
    await ensureAuditEvent({ actorUserId: staff.id, businessId: business.id, branchId: branches[0].id, action: "MANUAL_AUDIT_STAMP_ISSUED", entityType: "StampTransaction", entityId: String(firstStamp.id), metadata: { source: "manual-audit-seed" } });

    created.businesses.push(`${business.name} (${seed.planCode})`);
  }

  console.log(`Manual audit seed completed for database: ${databaseName}`);
  console.log("");
  console.log("System Administrator:");
  console.log(`  ${adminEmail}`);
  console.log("");
  console.log("Business test accounts password:");
  console.log("  Use MANUAL_AUDIT_SEED_PASSWORD value.");
  console.log("");
  console.log("Accounts:");
  console.log(`  ${created.accounts.join("\n  ")}`);
  console.log("");
  console.log("Businesses:");
  console.log(`  ${created.businesses.join("\n  ")}`);
  console.log("");
  console.log("Example customer cards:");
  console.log(`  ${created.cards.slice(0, 8).join("\n  ")}`);
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
