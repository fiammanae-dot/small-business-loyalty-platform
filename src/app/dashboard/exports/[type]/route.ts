import { NextResponse } from "next/server";
import { alertTypeLabel } from "@/lib/alert-labels";
import { toCsv } from "@/lib/csv";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await requireRole("BUSINESS_OWNER");
  if (!user.businessId) return new NextResponse("Unauthorized", { status: 403 });
  const { type } = await params;

  const { filename, csv } = await buildExport(type, user.businessId);
  if (!filename) return new NextResponse("Export not found", { status: 404 });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function buildExport(type: string, businessId: number) {
  if (type === "customers") {
    const rows = await prisma.businessCustomerMembership.findMany({
      where: { businessId },
      include: { createdBranch: true },
      orderBy: { joinedAt: "desc" },
    });
    return {
      filename: "customers.csv",
      csv: toCsv(rows.map((row) => ({
        customer_name: `${row.firstName} ${row.lastName ?? ""}`.trim(),
        phone: row.phone,
        email: row.email,
        marketing_consent: row.marketingConsent,
        status: row.status,
        card_status: row.cardStatus,
        card_number: row.cardToken,
        created_branch: row.createdBranch?.name,
        joined_at: formatDate(row.joinedAt),
      }))),
    };
  }

  if (type === "programs") {
    const rows = await prisma.loyaltyProgram.findMany({
      where: { businessId },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      filename: "programs.csv",
      csv: toCsv(rows.map((row) => ({
        name: row.name,
        product_or_service: row.productOrServiceName,
        required_stamps: row.requiredStamps,
        starting_bonus_stamps: row.startingBonusStamps,
        reward: row.rewardName,
        active: row.active,
        enrolled_customers: row._count.memberships,
        created_at: formatDate(row.createdAt),
      }))),
    };
  }

  if (type === "redemptions") {
    const rows = await prisma.rewardRedemption.findMany({
      where: { businessId },
      include: {
        branch: true,
        redeemedByUser: true,
        customerProgramMembership: {
          include: { businessCustomerMembership: true },
        },
      },
      orderBy: { redeemedAt: "desc" },
    });
    return {
      filename: "redemptions.csv",
      csv: toCsv(rows.map((row) => ({
        reward: row.rewardName,
        customer_name: `${row.customerProgramMembership.businessCustomerMembership.firstName} ${row.customerProgramMembership.businessCustomerMembership.lastName ?? ""}`.trim(),
        branch: row.branch?.name,
        redeemed_by: row.redeemedByUser.name,
        redeemed_at: formatDateTime(row.redeemedAt),
      }))),
    };
  }

  if (type === "alerts") {
    const rows = await prisma.activityAlert.findMany({
      where: { businessId },
      include: { branch: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      filename: "alerts.csv",
      csv: toCsv(rows.map((row) => ({
        severity: row.severity,
        alert_type: alertTypeLabel(row.alertType),
        status: row.status,
        staff: row.user?.name,
        branch: row.branch?.name,
        created_at: formatDateTime(row.createdAt),
      }))),
    };
  }

  return { filename: null, csv: "" };
}
