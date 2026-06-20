/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const PILOT_DATABASE_NAME = "loyalty_platform_pilot";
const SYSTEM_ADMIN_EMAIL = requireEnv("PILOT_SYSTEM_ADMIN_EMAIL");
const SYSTEM_ADMIN_PASSWORD = requireEnv("PILOT_SEED_PASSWORD");

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

const subscriptionPlans = [
  {
    code: "STARTER",
    name: "Starter",
    maxBranches: 1,
    maxLoyaltyPrograms: 1,
    monthlyPrice: "100.00",
    annualPrice: "1000.00",
    billingCycleSupport: ["MONTHLY", "YEARLY"],
  },
  {
    code: "GROWTH",
    name: "Growth",
    maxBranches: 3,
    maxLoyaltyPrograms: 5,
    monthlyPrice: "200.00",
    annualPrice: "2000.00",
    billingCycleSupport: ["MONTHLY", "YEARLY"],
  },
  {
    code: "MULTI_BRANCH",
    name: "Multi Branch",
    maxBranches: 10,
    maxLoyaltyPrograms: 15,
    monthlyPrice: "0.00",
    annualPrice: "1000.00",
    billingCycleSupport: ["YEARLY"],
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

const customerNotificationTemplates = [
  ["STAMP_EARNED", "Stamp Earned", "You earned a new loyalty stamp."],
  ["TIER_UPGRADED", "Tier Upgraded", "Your loyalty tier has been upgraded."],
  ["REWARD_AVAILABLE", "Reward Available", "A loyalty reward is ready for you."],
  ["REFERRAL_REWARD_EARNED", "Referral Reward Earned", "You earned a referral reward."],
];

assertPilotDatabase();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const passwordHash = await bcrypt.hash(SYSTEM_ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: SYSTEM_ADMIN_EMAIL },
    update: {
      name: "System Administrator",
      passwordHash,
      role: "PLATFORM_OWNER",
      status: "ACTIVE",
      businessId: null,
      branchId: null,
      sessionVersion: { increment: 1 },
    },
    create: {
      name: "System Administrator",
      email: SYSTEM_ADMIN_EMAIL,
      passwordHash,
      role: "PLATFORM_OWNER",
      status: "ACTIVE",
    },
  });

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  await prisma.platformSetting.upsert({
    where: { key: "demo_mode" },
    update: { value: { enabled: false } },
    create: { key: "demo_mode", value: { enabled: false } },
  });

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

  for (const [notificationType, title, message] of customerNotificationTemplates) {
    const existing = await prisma.customerNotificationTemplate.findFirst({
      where: { businessId: null, notificationType },
      select: { id: true },
    });

    if (existing) {
      await prisma.customerNotificationTemplate.update({
        where: { id: existing.id },
        data: { title, message, active: true },
      });
    } else {
      await prisma.customerNotificationTemplate.create({
        data: { notificationType, title, message, active: true },
      });
    }
  }

  console.log("Pilot seed completed for loyalty_platform_pilot.");
  console.log("Created/updated: 1 System Administrator, 3 subscription plans, platform defaults, and global templates.");
  console.log("No businesses, branches, customers, programs, staff, referrals, alerts, scanner activity, subscriptions, or invoices were seeded.");
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