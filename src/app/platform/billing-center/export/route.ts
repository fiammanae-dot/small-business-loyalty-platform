import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { exportResponse, getExportFormat, type ExportRow } from "@/lib/export-files";
import { formatMoney, getInvoiceDisplayStatus } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatBillingCycle } from "@/lib/subscription-plans";
import { getSubscriptionRemainingDays, getTrialRemainingDays } from "@/lib/subscriptions";

type BillingParams = {
  tab?: string;
  business?: string;
  plan?: string;
  status?: string;
  date?: string;
  from?: string;
  to?: string;
  revenueMin?: string;
  revenueMax?: string;
  trial?: string;
  renewal?: string;
};

type SubscriptionRow = Prisma.BusinessSubscriptionGetPayload<{
  include: {
    business: { select: { uuid: true; name: true; status: true } };
    subscriptionPlan: true;
    auditLogs: { include: { user: { select: { name: true; email: true } } } };
    invoices: { include: { payments: true } };
  };
}>;

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: {
    business: { select: { uuid: true; name: true } };
    subscription: { include: { subscriptionPlan: true } };
    payments: true;
  };
}>;

export async function GET(request: Request) {
  await requireRole("PLATFORM_OWNER");

  const url = new URL(request.url);
  const format = getExportFormat(url.searchParams.get("format"));
  if (!format) return new NextResponse("Unsupported export format.", { status: 400 });

  const params = getParams(url.searchParams);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dateRange = getDateRange(params, now);

  const [plans, subscriptions, invoices, payments, businesses] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { maxBranches: "asc" } }),
    prisma.businessSubscription.findMany({
      include: {
        business: { select: { uuid: true, name: true, status: true } },
        subscriptionPlan: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 1, include: { user: { select: { name: true, email: true } } } },
        invoices: { include: { payments: true } },
      },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
    }),
    prisma.invoice.findMany({
      include: {
        business: { select: { uuid: true, name: true } },
        subscription: { include: { subscriptionPlan: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      include: { invoice: { include: { subscription: { include: { subscriptionPlan: true } }, business: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const filteredSubscriptions = subscriptions.filter((subscription) => matchesSubscriptionFilters(subscription, params, dateRange, now));
  const filteredInvoices = invoices.filter((invoice) => matchesInvoiceFilters(invoice, params, dateRange));
  const activeTab = getBillingTab(params.tab);
  const rows = buildRows(activeTab, {
    plans,
    subscriptions,
    invoices,
    payments,
    businesses,
    filteredSubscriptions,
    filteredInvoices,
    monthStart,
    lastMonthStart,
    yearStart,
    now,
  });

  return exportResponse({ rows, format, filename: `platform-billing-${activeTab}`, title: `Billing Center ${titleCase(activeTab)} Export` });
}

function getParams(searchParams: URLSearchParams): BillingParams {
  return {
    tab: searchParams.get("tab") ?? undefined,
    business: searchParams.get("business") ?? undefined,
    plan: searchParams.get("plan") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    revenueMin: searchParams.get("revenueMin") ?? undefined,
    revenueMax: searchParams.get("revenueMax") ?? undefined,
    trial: searchParams.get("trial") ?? undefined,
    renewal: searchParams.get("renewal") ?? undefined,
  };
}

function buildRows(
  tab: "overview" | "subscriptions" | "invoices" | "analytics",
  data: {
    plans: Array<{ id: number; name: string }>;
    subscriptions: SubscriptionRow[];
    invoices: InvoiceRow[];
    payments: Array<{ amount: Prisma.Decimal; paidAt: Date; invoice: { subscription: { subscriptionPlanId: number; subscriptionPlan: { name: string } }; business: { name: string } } }>;
    businesses: Array<{ id: number; name: string }>;
    filteredSubscriptions: SubscriptionRow[];
    filteredInvoices: InvoiceRow[];
    monthStart: Date;
    lastMonthStart: Date;
    yearStart: Date;
    now: Date;
  },
): ExportRow[] {
  if (tab === "subscriptions") return subscriptionRows(data.filteredSubscriptions, data.now);
  if (tab === "invoices") return invoiceRows(data.filteredInvoices);
  if (tab === "analytics") return analyticsRows(data);
  return overviewRows(data);
}

function overviewRows(data: Parameters<typeof buildRows>[1]): ExportRow[] {
  const activeSubscriptions = data.subscriptions.filter((subscription) => subscription.status === "ACTIVE");
  const trialSubscriptions = data.subscriptions.filter((subscription) => subscription.status === "TRIAL");
  const expiringWithin30 = data.subscriptions.filter((subscription) => {
    const days = getSubscriptionRemainingDays(subscription);
    return days !== null && days >= 0 && days <= 30;
  });
  const overdueInvoices = data.invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "OVERDUE");
  const suspendedAccounts = data.subscriptions.filter((subscription) => subscription.status === "SUSPENDED");
  const cancelledSubscriptions = data.subscriptions.filter((subscription) => subscription.status === "CANCELLED");
  const monthlyRevenue = sumPayments(data.payments.filter((payment) => payment.paidAt >= data.monthStart));
  const todayRevenue = sumPayments(data.payments.filter((payment) => isSameUtcDay(payment.paidAt, data.now)));
  const lastMonthRevenue = sumPayments(data.payments.filter((payment) => payment.paidAt >= data.lastMonthStart && payment.paidAt < data.monthStart));
  const ytdRevenue = sumPayments(data.payments.filter((payment) => payment.paidAt >= data.yearStart));
  const outstandingRevenue = data.invoices
    .filter((invoice) => !["PAID", "CANCELLED"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount) - invoice.payments.reduce((paid, payment) => paid + Number(payment.amount), 0)), 0);

  return [
    { Section: "Overview", Metric: "Monthly Revenue", Value: formatMoney(monthlyRevenue) },
    { Section: "Overview", Metric: "Annual Revenue Projection", Value: formatMoney(monthlyRevenue * 12) },
    { Section: "Overview", Metric: "Today Revenue", Value: formatMoney(todayRevenue) },
    { Section: "Overview", Metric: "Last Month Revenue", Value: formatMoney(lastMonthRevenue) },
    { Section: "Overview", Metric: "Year to Date Revenue", Value: formatMoney(ytdRevenue) },
    { Section: "Overview", Metric: "Outstanding Revenue", Value: formatMoney(outstandingRevenue) },
    { Section: "Overview", Metric: "Active Subscriptions", Value: activeSubscriptions.length },
    { Section: "Overview", Metric: "Trial Subscriptions", Value: trialSubscriptions.length },
    { Section: "Overview", Metric: "Expiring Within 30 Days", Value: expiringWithin30.length },
    { Section: "Overview", Metric: "Overdue Invoices", Value: overdueInvoices.length },
    { Section: "Overview", Metric: "Suspended Accounts", Value: suspendedAccounts.length },
    { Section: "Overview", Metric: "Cancelled Subscriptions", Value: cancelledSubscriptions.length },
  ];
}

function analyticsRows(data: Parameters<typeof buildRows>[1]): ExportRow[] {
  const revenueByPlan = calculateRevenueByPlan(data.payments, data.plans);
  const planRows = revenueByPlan.map((plan) => ({ Section: "Plan Revenue", Metric: plan.name, Value: formatMoney(plan.revenue) }));
  const subscriptionsByPlan = data.plans.map((plan) => ({
    Section: "Active Subscriptions By Plan",
    Metric: plan.name,
    Value: data.subscriptions.filter((subscription) => subscription.subscriptionPlanId === plan.id && subscription.status === "ACTIVE").length,
  }));
  return [...planRows, ...subscriptionsByPlan];
}

function subscriptionRows(subscriptions: SubscriptionRow[], now: Date): ExportRow[] {
  return subscriptions.map((subscription) => ({
    Business: subscription.business.name,
    Plan: subscription.subscriptionPlan.name,
    Status: deriveLifecycleStatus(subscription),
    "Raw Status": subscription.status,
    "Billing Cycle": formatBillingCycle(subscription.billingCycle),
    "Start Date": formatDate(subscription.startDate),
    "Expiry Date": subscription.expiryDate ? formatDate(subscription.expiryDate) : "-",
    "Renewal Date": subscription.renewalDate ? formatDate(subscription.renewalDate) : "-",
    "Days Remaining": getSubscriptionRemainingDays(subscription) ?? "-",
    "Trial Days Remaining": getTrialRemainingDays(subscription) ?? "-",
    "Invoices": subscription.invoices.length,
    "Payments Recorded": subscription.invoices.reduce((sum, invoice) => sum + invoice.payments.length, 0),
    "Last Audit": subscription.auditLogs[0]?.action ?? "-",
    "Last Audit User": subscription.auditLogs[0]?.user?.email ?? "-",
  }));
}

function invoiceRows(invoices: InvoiceRow[]): ExportRow[] {
  return invoices.map((invoice) => {
    const paidAmount = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const lastPaidAt = invoice.payments.reduce<Date | null>(
      (latest, payment) => (!latest || payment.paidAt > latest ? payment.paidAt : latest),
      null,
    );
    return {
      "Invoice Number": invoice.invoiceNumber,
      Business: invoice.business.name,
      Plan: invoice.subscription.subscriptionPlan.name,
      Amount: formatMoney(invoice.amount),
      "Paid Amount": formatMoney(paidAmount),
      "Outstanding Amount": formatMoney(Math.max(0, Number(invoice.amount) - paidAmount)),
      Status: getInvoiceDisplayStatus(invoice),
      "Raw Status": invoice.status,
      "Billing Cycle": formatBillingCycle(invoice.subscription.billingCycle),
      "Issue Date": formatDate(invoice.invoiceDate),
      "Due Date": formatDate(invoice.dueDate),
      "Payment Date": lastPaidAt ? formatDate(lastPaidAt) : "-",
      "Payments Recorded": invoice.payments.length,
      Notes: invoice.notes ?? "-",
    };
  });
}

function matchesSubscriptionFilters(subscription: SubscriptionRow, params: BillingParams, dateRange: { from: Date; to: Date }, now: Date) {
  if (params.business && !subscription.business.name.toLowerCase().includes(params.business.toLowerCase())) return false;
  if (params.plan && subscription.subscriptionPlanId !== Number(params.plan)) return false;
  if (params.status && deriveLifecycleStatus(subscription) !== params.status && subscription.status !== params.status) return false;
  if (subscription.createdAt < dateRange.from || subscription.createdAt > dateRange.to) return false;
  const monthly = getAnnualSubscriptionValue(subscription) / 12;
  if (params.revenueMin && monthly < Number(params.revenueMin)) return false;
  if (params.revenueMax && monthly > Number(params.revenueMax)) return false;
  if (params.trial === "trial" && subscription.status !== "TRIAL") return false;
  if (params.trial === "paid" && subscription.status === "TRIAL") return false;
  if (params.renewal) {
    const days = daysUntil(subscription.renewalDate, now);
    if (params.renewal === "today" && days !== 0) return false;
    if (params.renewal === "week" && (days === null || days < 0 || days > 7)) return false;
    if (params.renewal === "month" && (days === null || days < 0 || days > 30)) return false;
    if (params.renewal === "overdue" && (days === null || days >= 0)) return false;
  }
  return true;
}

function matchesInvoiceFilters(invoice: InvoiceRow, params: BillingParams, dateRange: { from: Date; to: Date }) {
  if (params.business && !invoice.business.name.toLowerCase().includes(params.business.toLowerCase())) return false;
  if (params.plan && invoice.subscription.subscriptionPlanId !== Number(params.plan)) return false;
  if (invoice.createdAt < dateRange.from || invoice.createdAt > dateRange.to) return false;
  const amount = Number(invoice.amount);
  if (params.revenueMin && amount < Number(params.revenueMin)) return false;
  if (params.revenueMax && amount > Number(params.revenueMax)) return false;
  return true;
}

function deriveLifecycleStatus(subscription: SubscriptionRow) {
  const now = new Date();
  if (subscription.status === "TRIAL") return "TRIAL";
  if (subscription.status === "SUSPENDED") return "SUSPENDED";
  if (subscription.status === "CANCELLED") return "CANCELLED";
  if (subscription.status === "EXPIRED" || (subscription.expiryDate && subscription.expiryDate < now)) return "EXPIRED";
  const remaining = getSubscriptionRemainingDays(subscription);
  if (remaining !== null && remaining >= 0 && remaining <= 14) return "PENDING_RENEWAL";
  return subscription.status;
}

function getAnnualSubscriptionValue(subscription: SubscriptionRow) {
  if (subscription.billingCycle === "MONTHLY") return Number(subscription.subscriptionPlan.monthlyPrice) * 12;
  return Number(subscription.subscriptionPlan.annualPrice);
}

function getDateRange(params: BillingParams, now: Date) {
  if (params.date === "custom" && params.from && params.to) return { from: new Date(`${params.from}T00:00:00.000Z`), to: new Date(`${params.to}T23:59:59.999Z`) };
  if (params.date === "7d") return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  if (params.date === "month") return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: now };
  return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
}

function sumPayments(payments: Array<{ amount: Prisma.Decimal | number }>) {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

function calculateRevenueByPlan(payments: Array<{ amount: Prisma.Decimal; invoice: { subscription: { subscriptionPlanId: number; subscriptionPlan: { name: string } } } }>, plans: Array<{ id: number; name: string }>) {
  return plans
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      revenue: sumPayments(payments.filter((payment) => payment.invoice.subscription.subscriptionPlanId === plan.id)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function daysUntil(date: Date | null, now: Date) {
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function getBillingTab(value?: string): "overview" | "subscriptions" | "invoices" | "analytics" {
  return value === "subscriptions" || value === "invoices" || value === "analytics" ? value : "overview";
}

function isSameUtcDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
