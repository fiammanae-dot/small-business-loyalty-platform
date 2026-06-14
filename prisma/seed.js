const { PrismaClient, UserRole } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const subscriptionPlans = [
  {
    name: "Starter",
    maxBranches: 1,
    maxLoyaltyPrograms: 1,
    features: ["Basic customer database", "QR loyalty card", "WhatsApp reminder"],
    priceMonthly: "29.00",
  },
  {
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
  {
    name: "Multi-Branch",
    maxBranches: 10,
    maxLoyaltyPrograms: 25,
    features: [
      "Multiple branches",
      "Multiple loyalty programs",
      "Referral program support (future)",
      "Birthday rewards (future)",
      "Multi-branch reporting (future)",
    ],
    priceMonthly: "0.00",
  },
  {
    name: "Premium",
    maxBranches: 25,
    maxLoyaltyPrograms: 50,
    features: [
      "Everything in Multi-Branch",
      "Advanced reporting (future)",
      "Priority support (future)",
    ],
    priceMonthly: "0.00",
  },
];

const messageTemplates = [
  ["REWARD_READY", "Reward Ready", "\u{1F389} Congratulations! Your reward is ready to redeem."],
  ["NEAR_REWARD", "Near Reward", "\u2B50 You're only {{remaining_stamps}} stamps away from your reward."],
  ["BIRTHDAY", "Birthday", "\u{1F382} Happy Birthday! Enjoy a special reward from us."],
  ["INACTIVE_30_DAYS", "Inactive Customer", "We miss you. Visit us again and continue earning rewards."],
  ["INACTIVE_60_DAYS", "Inactive Customer", "We miss you. Visit us again and continue earning rewards."],
  ["INACTIVE_90_DAYS", "Inactive Customer", "We miss you. Visit us again and continue earning rewards."],
  ["REWARD_REDEEMED", "Reward Redeemed", "\u{1F381} Thank you for redeeming your reward."],
  ["WELCOME_CUSTOMER", "Welcome Customer", "Welcome to our loyalty program."],
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for seeding.`);
  }

  return value;
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Administrator",
      passwordHash,
      role: UserRole.PLATFORM_OWNER,
      status: "ACTIVE",
    },
    create: {
      name: "System Administrator",
      email: adminEmail,
      passwordHash,
      role: UserRole.PLATFORM_OWNER,
      status: "ACTIVE",
    },
  });

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        maxBranches: plan.maxBranches,
        maxLoyaltyPrograms: plan.maxLoyaltyPrograms,
        features: plan.features,
        priceMonthly: plan.priceMonthly,
      },
      create: {
        name: plan.name,
        maxBranches: plan.maxBranches,
        maxLoyaltyPrograms: plan.maxLoyaltyPrograms,
        features: plan.features,
        priceMonthly: plan.priceMonthly,
      },
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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
