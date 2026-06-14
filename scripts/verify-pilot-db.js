/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const PILOT_DATABASE_NAME = "loyalty_platform_pilot";
const FORBIDDEN_PATTERN = /(demo|test|phase|smoke|debug|[0-9]{10,})/i;

function assertPilotDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Point it to loyalty_platform_pilot before verification.");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (databaseName !== PILOT_DATABASE_NAME) {
    throw new Error(`Refusing to verify database "${databaseName}". Expected "${PILOT_DATABASE_NAME}".`);
  }
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function checkCleanName(label, value, failures) {
  assert(value && !FORBIDDEN_PATTERN.test(value), `${label} has suspicious value: ${value}`, failures);
}

assertPilotDatabase();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const systemAdminEmail = process.env.PILOT_SYSTEM_ADMIN_EMAIL?.trim();

async function main() {
  const failures = [];

  const platformOwner = await prisma.user.findUnique({
    where: { email: systemAdminEmail ?? "" },
    select: { id: true, role: true, status: true },
  });
  assert(Boolean(systemAdminEmail), "PILOT_SYSTEM_ADMIN_EMAIL is required for verification.", failures);
  assert(platformOwner?.role === "PLATFORM_OWNER" && platformOwner?.status === "ACTIVE", "Active System Administrator is missing.", failures);

  const businesses = await prisma.business.findMany({
    where: {
      name: {
        in: ["Harbor Coffee House", "Cedar Table Restaurant", "Sharp Line Barbershop"],
      },
    },
    include: {
      users: true,
      branches: true,
      branding: true,
      subscriptions: { include: { subscriptionPlan: true } },
      loyaltyPrograms: { include: { memberships: true } },
      customerMemberships: {
        include: {
          globalCustomer: true,
          programMemberships: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  assert(businesses.length === 3, `Expected 3 pilot businesses, found ${businesses.length}.`, failures);

  for (const business of businesses) {
    checkCleanName(`Business ${business.id}`, business.name, failures);
    assert(business.branding, `${business.name} is missing branding.`, failures);
    assert(
      business.subscriptions.some((subscription) => subscription.status === "ACTIVE"),
      `${business.name} is missing an active subscription.`,
      failures,
    );

    const owners = business.users.filter((user) => user.role === "BUSINESS_OWNER");
    const managers = business.users.filter((user) => user.role === "BRANCH_MANAGER");
    const staff = business.users.filter((user) => user.role === "STAFF");
    assert(owners.length === 1, `${business.name} should have exactly 1 Business Owner.`, failures);
    assert(managers.length === 1, `${business.name} should have exactly 1 Branch Manager.`, failures);
    assert(staff.length === 1, `${business.name} should have exactly 1 Staff user.`, failures);

    for (const user of business.users) {
      checkCleanName(`User ${user.email}`, user.name, failures);
    }
    for (const branch of business.branches) {
      checkCleanName(`Branch ${branch.id}`, branch.name, failures);
    }

    assert(business.branches.length >= 1, `${business.name} has no branches.`, failures);
    assert(business.loyaltyPrograms.length === 1, `${business.name} should have exactly 1 loyalty program.`, failures);

    const program = business.loyaltyPrograms[0];
    if (program) {
      checkCleanName(`Program ${program.id}`, program.name, failures);
      checkCleanName(`Program product/service ${program.id}`, program.productOrServiceName, failures);
      checkCleanName(`Program reward ${program.id}`, program.rewardName, failures);
      if (program.description) checkCleanName(`Program description ${program.id}`, program.description, failures);
    }

    assert(business.customerMemberships.length === 3, `${business.name} should have 3 customer memberships.`, failures);
    for (const membership of business.customerMemberships) {
      assert(membership.cardToken?.startsWith("cst_"), `${business.name} customer membership ${membership.id} is missing card token.`, failures);
      checkCleanName(`Customer ${membership.globalCustomer.id}`, membership.globalCustomer.firstName, failures);
      if (membership.globalCustomer.lastName) {
        checkCleanName(`Customer ${membership.globalCustomer.id}`, membership.globalCustomer.lastName, failures);
      }

      assert(membership.programMemberships.length === 1, `${business.name} customer membership ${membership.id} is not enrolled in one program.`, failures);
      const programMembership = membership.programMemberships[0];
      assert(programMembership?.scanToken?.startsWith("scan_"), `${business.name} customer membership ${membership.id} is missing scan token.`, failures);
    }
  }

  if (failures.length > 0) {
    console.error("Pilot database verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Pilot database verification passed.");
  console.log("- System Administrator exists");
  console.log("- 3 pilot businesses exist");
  console.log("- Roles, branches, branding, subscriptions, programs, customers, card tokens, and scan tokens are present");
  console.log("- No pilot-facing names include Demo/Test/Phase/Smoke/debug/timestamp patterns");
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
