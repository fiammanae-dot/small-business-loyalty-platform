/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off guarded cleanup: remove every business except one keeper.
 *
 * Deliberately NOT wired into the app, npm scripts, or CI. Run it by hand:
 *
 *   node scripts/cleanup-demo-businesses.js --keep 1
 *   node scripts/cleanup-demo-businesses.js --keep 1 --confirm
 *
 * Without --confirm it is a dry run and makes no writes at all.
 *
 * Business owns cascading deletes for essentially all of its children, so
 * deleting the business row takes the memberships, programs, stamps,
 * redemptions, engagement events, invoices, payments, support sessions and the
 * rest with it. Two relations do NOT cascade:
 *
 *   - User.business is optional with no cascade, so users would be left behind
 *     with a null business_id. Their ids are captured before the businesses go,
 *     because afterwards the link is gone and unrecoverable, and then deleted.
 *   - AuditEvent.business is explicitly onDelete: SetNull, because audit history
 *     is meant to outlive the business row. Those rows are left in place; this
 *     script reports how many will be orphaned rather than quietly destroying an
 *     audit trail the schema goes out of its way to preserve.
 *
 * global_customers are shared cross-business identity and are left alone by
 * default; --purge-orphan-customers removes the ones left with no memberships.
 */

const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const nextEnv = require("@next/env");
const { Pool } = require("pg");

nextEnv.loadEnvConfig(process.cwd());

const DEFAULT_KEEP_ID = 1;

// A demo dataset is small. Anything larger is assumed to be real data until the
// operator says otherwise, in full, on the command line.
const MAX_UNFORCED_DELETIONS = 9;

const BACKUP_DIR = "backups";

/**
 * Tables whose user reference is required and does not cascade. A row that
 * survives this cleanup (it belongs to the keeper) but points at a demo user
 * would make the user delete fail, rolling the whole transaction back. Checked
 * up front so the dry run can say so instead.
 */
const BLOCKING_USER_REFERENCES = [
  { label: "stamp transactions", model: "stampTransaction", field: "issuedByUserId" },
  { label: "reward redemptions", model: "rewardRedemption", field: "redeemedByUserId" },
  { label: "invoices", model: "invoice", field: "createdByUserId" },
  { label: "payments", model: "payment", field: "recordedByUserId" },
  { label: "cooldown events", model: "cooldownEvent", field: "staffUserId" },
  { label: "support requests", model: "supportRequest", field: "requestedByUserId" },
  { label: "support sessions", model: "supportSession", field: "adminUserId" },
  { label: "support session activities", model: "supportSessionActivity", field: "adminUserId" },
];

function parseArgs(argv) {
  const options = {
    keep: DEFAULT_KEEP_ID,
    confirm: false,
    purgeOrphanCustomers: false,
    forceCount: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--confirm") {
      options.confirm = true;
    } else if (arg === "--purge-orphan-customers") {
      options.purgeOrphanCustomers = true;
    } else if (arg === "--keep") {
      options.keep = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--force-count") {
      options.forceCount = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function usage() {
  console.log(
    [
      "Usage: node scripts/cleanup-demo-businesses.js --keep <id> [--confirm] [--purge-orphan-customers]",
      "",
      "  --keep <id>                 Business id to keep (default: 1).",
      "  --confirm                   Actually delete. Without it, this is a dry run.",
      "  --purge-orphan-customers    Also delete global_customers left with no memberships.",
      "  --force-count <n>           Required when more than 9 businesses would be deleted;",
      "                              must match the number of businesses exactly.",
    ].join("\n"),
  );
}

function refuse(message) {
  console.error(`REFUSED: ${message}`);
  process.exitCode = 1;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function formatRow(business, customerCount, stampCount) {
  return `    [${business.id}] ${business.name} - ${customerCount} customers, ${stampCount} stamps`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    usage();
    return;
  }

  if (!process.env.DATABASE_URL) {
    refuse("DATABASE_URL is not set. Point it at the database you intend to clean.");
    return;
  }

  if (!Number.isInteger(options.keep) || options.keep < 1) {
    refuse(`--keep must be a positive integer business id (got: ${process.argv.slice(2).join(" ") || "nothing"}).`);
    return;
  }

  if (options.forceCount !== null && !Number.isInteger(options.forceCount)) {
    refuse("--force-count must be an integer.");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");
    console.log(`Database: ${databaseName}`);
    console.log(options.confirm ? "Mode:     CONFIRMED - this will delete data.\n" : "Mode:     DRY RUN - no writes.\n");

    // --- Guard: the keeper has to be real. -----------------------------------
    const keeper = await prisma.business.findUnique({
      where: { id: options.keep },
      select: { id: true, name: true, status: true, deletedAt: true },
    });

    if (!keeper) {
      refuse(`Keeper business id ${options.keep} does not exist. Nothing was touched.`);
      return;
    }

    const businesses = await prisma.business.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    const deleteIds = businesses.filter((business) => business.id !== keeper.id).map((business) => business.id);

    // --- Guard: the keeper must never be in the delete set. -------------------
    if (deleteIds.includes(keeper.id)) {
      refuse(`Keeper business id ${keeper.id} appeared in the delete set. Nothing was touched.`);
      return;
    }

    console.log(`Keeper:   [${keeper.id}] ${keeper.name}`);

    if (deleteIds.length === 0) {
      console.log("\nNothing to delete: the keeper is the only business.");
      return;
    }

    // --- Guard: refuse a large delete without an explicit, matching count. ----
    if (deleteIds.length > MAX_UNFORCED_DELETIONS && options.forceCount !== deleteIds.length) {
      refuse(
        `${deleteIds.length} businesses would be deleted, over the safety limit of ${MAX_UNFORCED_DELETIONS}. ` +
          `If that is really intended, re-run with --force-count ${deleteIds.length}. Nothing was touched.`,
      );
      return;
    }

    // --- Gather what would go. ------------------------------------------------
    const [customerCounts, stampCounts, demoUsers, orphanedAuditEvents] = await Promise.all([
      prisma.businessCustomerMembership.groupBy({
        by: ["businessId"],
        where: { businessId: { in: deleteIds } },
        _count: { _all: true },
      }),
      prisma.stampTransaction.groupBy({
        by: ["businessId"],
        where: { businessId: { in: deleteIds } },
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: { businessId: { in: deleteIds } },
        orderBy: { id: "asc" },
      }),
      prisma.auditEvent.count({ where: { businessId: { in: deleteIds } } }),
    ]);

    const customerCountById = new Map(customerCounts.map((row) => [row.businessId, row._count._all]));
    const stampCountById = new Map(stampCounts.map((row) => [row.businessId, row._count._all]));
    const demoUserIds = demoUsers.map((user) => user.id);

    // --- Guard: platform admins are identified by a null business_id and so are
    // never in this set. Assert it anyway - this is the destructive path.
    const platformAdmins = demoUsers.filter((user) => user.businessId === null || user.role === "PLATFORM_OWNER");
    if (platformAdmins.length > 0) {
      refuse(
        `Refusing to delete platform-level accounts: ${platformAdmins
          .map((user) => `[${user.id}] ${user.email}`)
          .join(", ")}. Nothing was touched.`,
      );
      return;
    }

    console.log(`\nBusinesses to delete (${deleteIds.length}):`);
    for (const business of businesses.filter((candidate) => deleteIds.includes(candidate.id))) {
      console.log(formatRow(business, customerCountById.get(business.id) ?? 0, stampCountById.get(business.id) ?? 0));
    }

    console.log(`\nUser accounts to delete: ${demoUsers.length}`);
    for (const user of demoUsers) {
      console.log(`    [${user.id}] ${user.email} (${user.role})`);
    }

    let orphanCustomerCount = 0;
    if (options.purgeOrphanCustomers) {
      // Customers with no membership outside the delete set are exactly the ones
      // that will have zero memberships once the deletes land.
      orphanCustomerCount = await prisma.globalCustomer.count({
        where: { memberships: { none: { businessId: { notIn: deleteIds } } } },
      });
      console.log(`\nGlobal customers to purge: ${orphanCustomerCount}`);
    } else {
      console.log("\nGlobal customers: left as-is (pass --purge-orphan-customers to remove the orphans).");
    }

    if (orphanedAuditEvents > 0) {
      console.log(
        `\nNote: ${orphanedAuditEvents} audit events belong to these businesses. AuditEvent.business is` +
          "\n      onDelete: SetNull by design, so those rows SURVIVE with a null business_id and a null" +
          "\n      actor_user_id. This script does not delete audit history.",
      );
    }

    // --- Guard: a surviving row pointing at a demo user would fail the delete. -
    const blockers = [];
    for (const reference of BLOCKING_USER_REFERENCES) {
      if (demoUserIds.length === 0) break;
      const count = await prisma[reference.model].count({
        where: { businessId: { notIn: deleteIds }, [reference.field]: { in: demoUserIds } },
      });
      if (count > 0) blockers.push(`${count} ${reference.label} (${reference.field})`);
    }

    if (blockers.length > 0) {
      refuse(
        "Rows belonging to the keeper still reference demo users through a required foreign key, so the " +
          `user delete would fail:\n    ${blockers.join("\n    ")}\nNothing was touched.`,
      );
      return;
    }

    if (!options.confirm) {
      console.log("\nDRY RUN complete. No writes were made. Re-run with --confirm to apply.");
      return;
    }

    // --- Backup before anything is destroyed. ---------------------------------
    const backupPayload = await prisma.business.findMany({
      where: { id: { in: deleteIds } },
      include: {
        customerMemberships: { include: { programMemberships: true } },
        stampTransactions: true,
        rewardRedemptions: true,
        engagementEvents: true,
        activityAlerts: true,
      },
      orderBy: { id: "asc" },
    });

    mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = join(BACKUP_DIR, `demo-cleanup-${utcStamp(new Date())}.json`);
    writeFileSync(
      backupPath,
      `${JSON.stringify(
        {
          takenAt: new Date().toISOString(),
          database: databaseName,
          keeper,
          deletedBusinessIds: deleteIds,
          businesses: backupPayload,
          users: demoUsers,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`\nBackup written: ${backupPath}`);

    // --- Delete. --------------------------------------------------------------
    const result = await prisma.$transaction(
      async (tx) => {
        // Captured inside the transaction and before the businesses go: once the
        // business row is deleted, business_id is null and the link is lost.
        const usersToDelete = await tx.user.findMany({
          where: { businessId: { in: deleteIds } },
          select: { id: true },
        });
        const idsToDelete = usersToDelete.map((user) => user.id);

        const deletedBusinesses = await tx.business.deleteMany({ where: { id: { in: deleteIds } } });

        const deletedUsers =
          idsToDelete.length > 0
            ? await tx.user.deleteMany({ where: { id: { in: idsToDelete } } })
            : { count: 0 };

        const purgedCustomers = options.purgeOrphanCustomers
          ? await tx.globalCustomer.deleteMany({ where: { memberships: { none: {} } } })
          : { count: 0 };

        return {
          businesses: deletedBusinesses.count,
          users: deletedUsers.count,
          customers: purgedCustomers.count,
        };
      },
      { timeout: 120_000 },
    );

    console.log("\nCleanup complete.");
    console.log(`    Businesses deleted: ${result.businesses}`);
    console.log(`    Users deleted:      ${result.users}`);
    if (options.purgeOrphanCustomers) console.log(`    Customers purged:   ${result.customers}`);
    console.log(`    Backup file:        ${backupPath}`);
    console.log(`    Kept:               [${keeper.id}] ${keeper.name}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Cleanup failed. No partial deletion was committed - the transaction rolls back as a unit.");
  console.error(error);
  process.exitCode = 1;
});
