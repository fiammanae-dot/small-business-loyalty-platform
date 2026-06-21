import { NextResponse } from "next/server";
import type { ActivityAlertStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { exportResponse, getExportFormat, type ExportRow } from "@/lib/export-files";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

type TenantParams = {
  q?: string;
  status?: string;
  plan?: string;
  health?: string;
};

type TenantRecord = Prisma.BusinessGetPayload<{
  include: {
    branches: { select: { id: true; name: true; status: true } };
    users: { select: { id: true; name: true; email: true; role: true; status: true } };
    customerMemberships: { select: { id: true } };
    loyaltyPrograms: { select: { id: true; active: true } };
    scanEvents: { select: { id: true } };
    activityAlerts: { select: { id: true; status: true } };
    subscriptions: { include: { subscriptionPlan: true } };
  };
}>;

type DecoratedTenant = TenantRecord & {
  ownerName: string;
  ownerEmail: string;
  planName: string;
  subscriptionStatus: SubscriptionStatus | "UNASSIGNED";
  tenantHealth: "Healthy" | "Attention Needed" | "At Risk";
  healthReasons: string[];
};

const activeAlertStatuses: ActivityAlertStatus[] = ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED"];

export async function GET(request: Request) {
  await requireRole("PLATFORM_OWNER");

  const url = new URL(request.url);
  const format = getExportFormat(url.searchParams.get("format"));
  if (!format) return new NextResponse("Unsupported export format.", { status: 400 });

  const params = getParams(url.searchParams);
  const now = new Date();
  const businesses = await prisma.business.findMany({
    include: {
      branches: { select: { id: true, name: true, status: true }, orderBy: { name: "asc" } },
      users: { select: { id: true, name: true, email: true, role: true, status: true }, orderBy: { createdAt: "asc" } },
      customerMemberships: { select: { id: true } },
      loyaltyPrograms: { select: { id: true, active: true } },
      scanEvents: { select: { id: true } },
      activityAlerts: { where: { status: { in: activeAlertStatuses } }, select: { id: true, status: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { subscriptionPlan: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: ExportRow[] = businesses
    .map((business) => decorateTenant(business, now))
    .filter((tenant) => matchesTenantFilters(tenant, params))
    .map((tenant) => ({
      "Business Name": tenant.name,
      "Business Type": businessTypeLabels[tenant.businessType],
      Status: titleCase(tenant.status),
      "Owner Name": tenant.ownerName,
      "Owner Email": tenant.ownerEmail,
      Plan: tenant.planName,
      "Subscription Status": titleCase(tenant.subscriptionStatus),
      Branches: tenant.branches.length,
      "Active Branches": tenant.branches.filter((branch) => branch.status === "ACTIVE").length,
      Users: tenant.users.length,
      "Inactive Staff": tenant.users.filter((user) => user.role !== "BUSINESS_OWNER" && user.status === "INACTIVE").length,
      Customers: tenant.customerMemberships.length,
      Programs: tenant.loyaltyPrograms.length,
      "Active Programs": tenant.loyaltyPrograms.filter((program) => program.active).length,
      "Scan Events": tenant.scanEvents.length,
      "Open Alerts": tenant.activityAlerts.length,
      "Tenant Health": tenant.tenantHealth,
      "Health Reasons": tenant.healthReasons.join("; "),
      "Created Date": formatDate(tenant.createdAt),
    }));

  return exportResponse({ rows, format, filename: "platform-tenant-center", title: "Tenant Center Export" });
}

function getParams(searchParams: URLSearchParams): TenantParams {
  return {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    plan: searchParams.get("plan") ?? undefined,
    health: searchParams.get("health") ?? undefined,
  };
}

function decorateTenant(business: TenantRecord, now: Date): DecoratedTenant {
  const owner = business.users.find((user) => user.role === "BUSINESS_OWNER");
  const subscription = business.subscriptions[0];
  const inactiveStaff = business.users.filter((user) => user.role !== "BUSINESS_OWNER" && user.status === "INACTIVE").length;
  const expiredTrial = subscription?.status === "TRIAL" && subscription.trialEndDate !== null && subscription.trialEndDate < now;
  const openAlerts = business.activityAlerts.length;
  const healthReasons: string[] = [];

  if (subscription?.status === "SUSPENDED" || subscription?.status === "EXPIRED" || subscription?.status === "CANCELLED") healthReasons.push(`Subscription ${titleCase(subscription.status)}`);
  if (expiredTrial) healthReasons.push("Expired trial");
  if (inactiveStaff > 0) healthReasons.push(`${inactiveStaff} inactive staff`);
  if (openAlerts > 0) healthReasons.push(`${openAlerts} open alerts`);
  if (healthReasons.length === 0) healthReasons.push("No tenant health issues detected");

  return {
    ...business,
    ownerName: owner?.name ?? "Unassigned",
    ownerEmail: owner?.email ?? "No owner email",
    planName: subscription?.subscriptionPlan.name ?? "Unassigned",
    subscriptionStatus: subscription?.status ?? "UNASSIGNED",
    tenantHealth: getTenantHealth({ subscriptionStatus: subscription?.status, inactiveStaff, expiredTrial, openAlerts }),
    healthReasons,
  };
}

function getTenantHealth({
  subscriptionStatus,
  inactiveStaff,
  expiredTrial,
  openAlerts,
}: {
  subscriptionStatus?: SubscriptionStatus;
  inactiveStaff: number;
  expiredTrial: boolean;
  openAlerts: number;
}): DecoratedTenant["tenantHealth"] {
  if (subscriptionStatus === "SUSPENDED" || subscriptionStatus === "EXPIRED" || subscriptionStatus === "CANCELLED" || expiredTrial || openAlerts >= 5) return "At Risk";
  if (subscriptionStatus === "TRIAL" || inactiveStaff > 0 || openAlerts > 0) return "Attention Needed";
  return "Healthy";
}

function matchesTenantFilters(tenant: DecoratedTenant, params: TenantParams) {
  const query = params.q?.trim().toLowerCase();
  if (query) {
    const haystack = [tenant.name, tenant.ownerName, tenant.ownerEmail, tenant.planName, businessTypeLabels[tenant.businessType]].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (params.status) {
    if (params.status === "ACTIVE" || params.status === "INACTIVE") {
      if (tenant.status !== params.status) return false;
    } else if (tenant.subscriptionStatus !== params.status) {
      return false;
    }
  }
  if (params.plan && tenant.planName !== params.plan) return false;
  if (params.health && tenant.tenantHealth !== params.health) return false;
  return true;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
