import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { exportResponse, getExportFormat, type ExportRow } from "@/lib/export-files";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

type AuditSearchParams = {
  search?: string;
  eventType?: string;
  severity?: string;
  role?: string;
  business?: string;
  branch?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
};

type AuditSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type AuditStatus = "Success" | "Failed" | "Blocked";

const severityOptions: AuditSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function GET(request: Request) {
  await requireRole("PLATFORM_OWNER");

  const url = new URL(request.url);
  const format = getExportFormat(url.searchParams.get("format"));
  if (!format) return new NextResponse("Unsupported export format.", { status: 400 });

  const params = getParams(url.searchParams);
  const dateRange = getDateRange(params, new Date());
  const businessId = params.business ? Number(params.business) : undefined;
  const branchId = params.branch ? Number(params.branch) : undefined;
  const events = await getAuditEvents({
    search: params.search,
    businessId: Number.isFinite(businessId) ? businessId : undefined,
    branchId: Number.isFinite(branchId) ? branchId : undefined,
    from: dateRange.from,
    to: dateRange.to,
  });

  const decorated = events
    .map(decorateAuditEvent)
    .filter((event) => (params.eventType ? event.eventType === params.eventType : true))
    .filter((event) => (params.severity ? event.severity === params.severity : true))
    .filter((event) => (params.status ? event.status === params.status : true))
    .filter((event) => (params.role ? event.actorUser?.role === params.role : true));

  const rows: ExportRow[] = decorated.map((event) => ({
    "Event ID": event.uuid,
    "Date and Time": formatDateTime(event.createdAt),
    "Event Type": event.eventType,
    Severity: event.severity,
    Status: event.status,
    Action: formatAction(event.action),
    Entity: event.entityType,
    "Entity Reference": event.entityId ?? "-",
    User: event.actorUser?.name ?? "System",
    Email: event.actorUser?.email ?? "-",
    Role: event.actorUser ? roleLabels[event.actorUser.role] : "System",
    Business: event.business?.name ?? "Platform",
    Branch: event.branch?.name ?? "-",
    "IP Address": event.ipAddress,
  }));

  return exportResponse({ rows, format, filename: "platform-audit-center", title: "Audit Center Export" });
}

function getParams(searchParams: URLSearchParams): AuditSearchParams {
  return {
    search: searchParams.get("search") ?? undefined,
    eventType: searchParams.get("eventType") ?? undefined,
    severity: searchParams.get("severity") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    business: searchParams.get("business") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };
}

async function getAuditEvents({ search, businessId, branchId, from, to }: { search?: string; businessId?: number; branchId?: number; from: Date; to: Date }) {
  const q = search?.trim();
  const searchFilters: Prisma.AuditEventWhereInput[] = q
    ? [
        ...(isUuid(q) ? [{ uuid: { equals: q } }] : []),
        { action: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { actorUser: { is: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } },
        { business: { is: { name: { contains: q, mode: "insensitive" } } } },
      ]
    : [];

  return prisma.auditEvent.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      ...(businessId ? { businessId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(searchFilters.length > 0 ? { OR: searchFilters } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      actorUser: { select: { name: true, email: true, role: true } },
      business: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function decorateAuditEvent<T extends Awaited<ReturnType<typeof getAuditEvents>>[number]>(event: T) {
  return {
    ...event,
    eventType: classifyEventType(event.action, event.entityType),
    severity: inferSeverity(event.action, event.metadata),
    status: inferStatus(event.action, event.metadata),
    ipAddress: getMetadataString(event.metadata, "ipAddress") ?? getMetadataString(event.metadata, "ip") ?? "Not recorded",
  };
}

function classifyEventType(action: string, entityType: string) {
  const value = `${action} ${entityType}`.toUpperCase();
  if (value.includes("CUSTOMER")) return "Customer Actions";
  if (value.includes("PROGRAM")) return "Program Actions";
  if (value.includes("BUSINESS")) return "Business Actions";
  if (value.includes("BRANCH")) return "Branch Actions";
  if (value.includes("USER") || value.includes("STAFF")) return "User Actions";
  if (value.includes("SUBSCRIPTION")) return "Subscription Actions";
  if (value.includes("INVOICE") || value.includes("PAYMENT")) return "Invoice Actions";
  if (value.includes("ALERT")) return "Alert Actions";
  if (value.includes("REFERRAL")) return "Referral Actions";
  if (value.includes("REWARD")) return "Reward Actions";
  if (value.includes("COOLDOWN")) return "Cooldown Actions";
  if (value.includes("LOGIN") || value.includes("AUTH")) return "Authentication Events";
  if (value.includes("DEMO_MODE")) return "Restricted Action Events";
  if (value.includes("SETTING") || value.includes("PLATFORM")) return "Platform Settings Events";
  if (value.includes("SECURITY") || value.includes("BLOCKED") || value.includes("PERMISSION")) return "Security Events";
  return "Administrative Changes";
}

function inferSeverity(action: string, metadata: unknown): AuditSeverity {
  const explicit = getMetadataString(metadata, "severity")?.toUpperCase();
  if (explicit && severityOptions.includes(explicit as AuditSeverity)) return explicit as AuditSeverity;
  if (action.includes("CRITICAL")) return "CRITICAL";
  if (action.includes("BLOCKED") || action.includes("PERMISSION") || action.includes("FAILED")) return "HIGH";
  if (action.includes("COOLDOWN") || action.includes("ALERT") || action.includes("DEMO_MODE")) return "MEDIUM";
  if (action.includes("UPDATED") || action.includes("CHANGED")) return "LOW";
  return "INFO";
}

function inferStatus(action: string, metadata: unknown): AuditStatus {
  const explicit = getMetadataString(metadata, "status") ?? getMetadataString(metadata, "result") ?? getMetadataString(metadata, "outcome");
  if (explicit?.toUpperCase().includes("BLOCK")) return "Blocked";
  if (explicit?.toUpperCase().includes("FAIL")) return "Failed";
  if (action.includes("BLOCKED")) return "Blocked";
  if (action.includes("FAILED")) return "Failed";
  return "Success";
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function getDateRange(params: AuditSearchParams, now: Date) {
  if (params.date === "custom" && params.from && params.to) {
    return { from: new Date(`${params.from}T00:00:00.000Z`), to: new Date(`${params.to}T23:59:59.999Z`) };
  }
  const days = params.date === "today" ? 1 : params.date === "7d" ? 7 : 30;
  return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now };
}

function formatAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
