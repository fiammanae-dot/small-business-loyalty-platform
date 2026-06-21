import { NextResponse } from "next/server";
import { exportResponse, getExportFormat, type ExportRow } from "@/lib/export-files";
import { checkDatabaseHealth } from "@/lib/database-health";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET(request: Request) {
  await requireRole("PLATFORM_OWNER");

  const url = new URL(request.url);
  const format = getExportFormat(url.searchParams.get("format"));
  if (!format) return new NextResponse("Unsupported export format.", { status: 400 });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    health,
    totalBusinesses,
    activeBusinesses,
    inactiveBusinesses,
    totalBranches,
    totalUsers,
    totalCustomers,
    totalLoyaltyPrograms,
    totalCustomerEnrollments,
    totalEarnedStamps,
    totalBonusStamps,
    totalRewardsRedeemed,
    totalQrScans,
    totalActiveSubscriptions,
    totalInactiveSubscriptions,
    failedLoginAttempts,
    invalidQrScans,
    disabledQrScans,
    suspiciousMultiStampTransactions,
    suspiciousActivityAlerts,
    newBusinessesThisMonth,
    newCustomersThisMonth,
    newLoyaltyProgramsThisMonth,
    newEnrollmentsThisMonth,
    databaseStats,
  ] = await Promise.all([
    checkDatabaseHealth(),
    prisma.business.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.business.count({ where: { status: "INACTIVE" } }),
    prisma.branch.count(),
    prisma.user.count(),
    prisma.globalCustomer.count(),
    prisma.loyaltyProgram.count(),
    prisma.businessCustomerMembership.count(),
    prisma.stampTransaction.aggregate({ _sum: { quantity: true } }),
    prisma.customerProgramMembership.aggregate({ _sum: { bonusStamps: true } }),
    prisma.rewardRedemption.count(),
    prisma.scanEvent.count({ where: { result: "VALID" } }),
    prisma.businessSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.businessSubscription.count({ where: { status: { not: "ACTIVE" } } }),
    prisma.failedLoginAudit.count({ where: { createdAt: { gte: last24Hours }, outcome: { in: ["FAILED", "LOCKED"] } } }),
    prisma.scanEvent.count({ where: { result: "INVALID" } }),
    prisma.scanEvent.count({ where: { result: "DISABLED" } }),
    prisma.stampTransaction.count({ where: { quantity: { gte: 3 } } }),
    prisma.activityAlert.count(),
    prisma.business.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.globalCustomer.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.loyaltyProgram.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.businessCustomerMembership.count({ where: { createdAt: { gte: monthStart } } }),
    getDatabaseStats(),
  ]);

  const rows: ExportRow[] = [
    { Section: "Database Health", Metric: "Database", Value: health.database ? "Connected" : "Not Connected" },
    { Section: "Database Health", Metric: "Prisma", Value: health.prisma ? "Connected" : "Not Connected" },
    { Section: "Database Health", Metric: "Session Store", Value: health.session ? "Connected" : "Not Connected" },
    { Section: "Database Health", Metric: "Database Size", Value: databaseStats.databaseSize },
    { Section: "Database Health", Metric: "Table Count", Value: databaseStats.tableCount },
    { Section: "Database Health", Metric: "Estimated Records", Value: databaseStats.totalRecords },
    { Section: "Platform", Metric: "Total Businesses", Value: totalBusinesses },
    { Section: "Platform", Metric: "Active Businesses", Value: activeBusinesses },
    { Section: "Platform", Metric: "Inactive Businesses", Value: inactiveBusinesses },
    { Section: "Platform", Metric: "Total Branches", Value: totalBranches },
    { Section: "Platform", Metric: "Total Users", Value: totalUsers },
    { Section: "Platform", Metric: "Total Customers", Value: totalCustomers },
    { Section: "Platform", Metric: "Total Loyalty Programs", Value: totalLoyaltyPrograms },
    { Section: "Loyalty", Metric: "Customer Enrollments", Value: totalCustomerEnrollments },
    { Section: "Loyalty", Metric: "Earned Stamps", Value: totalEarnedStamps._sum.quantity ?? 0 },
    { Section: "Loyalty", Metric: "Bonus Stamps", Value: totalBonusStamps._sum.bonusStamps ?? 0 },
    { Section: "Loyalty", Metric: "Rewards Redeemed", Value: totalRewardsRedeemed },
    { Section: "Loyalty", Metric: "Valid QR Scans", Value: totalQrScans },
    { Section: "Subscriptions", Metric: "Active Subscriptions", Value: totalActiveSubscriptions },
    { Section: "Subscriptions", Metric: "Inactive Subscriptions", Value: totalInactiveSubscriptions },
    { Section: "Security", Metric: "Failed Login Attempts Last 24h", Value: failedLoginAttempts },
    { Section: "Security", Metric: "Invalid QR Scans", Value: invalidQrScans },
    { Section: "Security", Metric: "Disabled QR Scans", Value: disabledQrScans },
    { Section: "Security", Metric: "Suspicious Multi-stamp Transactions", Value: suspiciousMultiStampTransactions },
    { Section: "Security", Metric: "Activity Alerts", Value: suspiciousActivityAlerts },
    { Section: "Growth This Month", Metric: "New Businesses", Value: newBusinessesThisMonth },
    { Section: "Growth This Month", Metric: "New Customers", Value: newCustomersThisMonth },
    { Section: "Growth This Month", Metric: "New Loyalty Programs", Value: newLoyaltyProgramsThisMonth },
    { Section: "Growth This Month", Metric: "New Enrollments", Value: newEnrollmentsThisMonth },
  ];

  return exportResponse({ rows, format, filename: "platform-health-analytics", title: "Health Analytics Export" });
}

async function getDatabaseStats() {
  try {
    const [sizeRows, tableRows, recordRows] = await Promise.all([
      prisma.$queryRaw<Array<{ size: string }>>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`,
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `,
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(n_live_tup), 0)::int AS total
        FROM pg_stat_user_tables
      `,
    ]);

    return {
      databaseSize: sizeRows[0]?.size ?? "Unknown",
      tableCount: tableRows[0]?.count ?? 0,
      totalRecords: recordRows[0]?.total ?? 0,
    };
  } catch (error) {
    console.error("Platform export database stats lookup failed", error);
    return {
      databaseSize: "Unknown",
      tableCount: 0,
      totalRecords: 0,
    };
  }
}
