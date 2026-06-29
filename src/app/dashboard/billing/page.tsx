import { DashboardShell } from "@/components/DashboardShell";
import { InvoiceBadge } from "@/components/InvoiceBadge";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  MetricCard,
  PageIntro,
  ProgressBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { formatMoney, getInvoiceDisplayStatus } from "@/lib/billing";
import { getBusinessOwnerContext, getCurrentPlan, getCurrentSubscription } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatBillingCycle, formatPlanPrice } from "@/lib/subscription-plans";
import { getSubscriptionRemainingDays, subscriptionDisplayDate, subscriptionStatusLabels } from "@/lib/subscriptions";
import { AlertTriangle, ArrowUpRight, Download, FileText, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";

export default async function BusinessBillingPage() {
  const { user, business } = await getBusinessOwnerContext();
  const currentPlan = getCurrentPlan(business);
  const currentSubscription = getCurrentSubscription(business);
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { annualPrice: "asc" } });
  const invoices = await prisma.invoice.findMany({
    where: { businessId: user.businessId },
    include: { payments: { select: { amount: true } }, subscription: { include: { subscriptionPlan: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalOutstanding = invoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((paidSum, payment) => paidSum + Number(payment.amount), 0);
    return sum + Math.max(0, Number(invoice.amount) - paid);
  }, 0);
  const paidInvoices = invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "PAID").length;
  const overdueInvoices = invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "OVERDUE").length;
  const issuedInvoices = invoices.filter((invoice) => getInvoiceDisplayStatus(invoice) === "ISSUED").length;
  const branchesUsed = business._count.branches;
  const programsUsed = business._count.loyaltyPrograms;
  const branchLimit = currentPlan?.maxBranches ?? 0;
  const programLimit = currentPlan?.maxLoyaltyPrograms ?? 0;
  const branchTone = usageTone(branchesUsed, branchLimit);
  const programTone = usageTone(programsUsed, programLimit);
  const renewalDate = subscriptionDisplayDate(currentSubscription ?? null);
  const daysRemaining = getSubscriptionRemainingDays(currentSubscription ?? null);
  const subscriptionStatus = currentSubscription?.status ?? "EXPIRED";

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Billing & Plan" hideWelcomeMessage>
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
        <PageIntro eyebrow="Business Owner" description="Manage your subscription, plan usage and billing history." actions={<><ButtonLink href="/dashboard/settings?tab=subscription" variant="business" rightIcon={<ArrowUpRight className="h-4 w-4" aria-hidden />}>Upgrade Plan / Manage Plan</ButtonLink>{invoices.length ? <ButtonLink href="/dashboard/exports/billing" variant="outline" leftIcon={<Download className="h-4 w-4" aria-hidden />}>Export Billing</ButtonLink> : null}</>} />

        <section aria-label="Billing summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Current Plan" value={currentPlan?.name ?? "No active plan"} helper={currentSubscription ? formatBillingCycle(currentSubscription.billingCycle) : "Subscription inactive"} tone="business" />
          <MetricCard label="Subscription Status" value={subscriptionStatusLabels[subscriptionStatus] ?? subscriptionStatus} helper={renewalDate ? `Renews ${formatDate(renewalDate)}` : "No renewal date"} tone={subscriptionStatus === "ACTIVE" ? "success" : subscriptionStatus === "TRIAL" ? "warning" : "danger"} />
          <MetricCard label="Outstanding" value={formatMoney(totalOutstanding)} helper={`${issuedInvoices + overdueInvoices} invoice${issuedInvoices + overdueInvoices === 1 ? "" : "s"} need attention`} tone={overdueInvoices > 0 ? "danger" : totalOutstanding > 0 ? "warning" : "neutral"} />
          <MetricCard label="Billing History" value={invoices.length} helper={`${paidInvoices} paid invoice${paidInvoices === 1 ? "" : "s"}`} icon={<ReceiptText className="h-5 w-5" />} tone="neutral" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Current Plan Summary" description="Your active subscription, renewal date and included limits."><div className="grid gap-3 sm:grid-cols-2"><Info label="Plan Name" value={currentPlan?.name ?? "No active plan"} /><Info label="Billing Cycle" value={currentSubscription ? formatBillingCycle(currentSubscription.billingCycle) : "-"} /><Info label="Subscription Status" value={<SubscriptionBadge status={subscriptionStatus} />} /><Info label="Renewal Date" value={renewalDate ? formatDate(renewalDate) : "-"} /><Info label="Price" value={currentPlan ? formatPlanPrice(currentPlan) : "-"} className="sm:col-span-2" /><Info label="Branch Limit" value={branchLimit ? `${branchLimit} branch${branchLimit === 1 ? "" : "es"}` : "-"} /><Info label="Program Limit" value={programLimit ? `${programLimit} program${programLimit === 1 ? "" : "s"}` : "-"} /></div></SectionCard>
          <SectionCard title="Subscription Health" description="The current state of access and payment readiness."><div className="space-y-3"><HealthRow label="Status" value={<SubscriptionBadge status={subscriptionStatus} />} /><HealthRow label="Days Remaining" value={daysRemaining === null ? "-" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`} /><HealthRow label="Payment Status" value={overdueInvoices > 0 ? "Payment issue" : totalOutstanding > 0 ? "Outstanding balance" : "No outstanding balance"} /><HealthRow label="Renewal" value={renewalDate ? formatDate(renewalDate) : "Not scheduled"} /></div></SectionCard>
        </section>

        <SectionCard title="Plan Usage" description="Track branches and loyalty programs against the limits included in your current plan."><div className="grid gap-4 lg:grid-cols-2"><UsageCard label="Branches used" used={branchesUsed} limit={branchLimit} tone={branchTone} /><UsageCard label="Programs used" used={programsUsed} limit={programLimit} tone={programTone} /></div></SectionCard>
        <BillingAlerts branchTone={branchTone} programTone={programTone} overdueInvoices={overdueInvoices} daysRemaining={daysRemaining} subscriptionStatus={subscriptionStatus} />

        <SectionCard title="Upgrade Guidance" description="Official LoyaltyBase plans available for future growth.">{plans.length ? <div className="grid gap-3 lg:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`rounded-md border p-4 ${plan.id === currentPlan?.id ? "business-border-soft business-bg-soft" : "border-[#E2E8F0] bg-white"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#0F172A]">{plan.name}</h3><p className="mt-1 text-sm text-[#64748B]">{formatPlanPrice(plan)}</p></div>{plan.id === currentPlan?.id ? <StatusBadge tone="business">Current</StatusBadge> : null}</div><dl className="mt-4 grid gap-2 text-sm text-[#475569]"><div className="flex justify-between gap-3"><dt>Branches</dt><dd className="font-semibold text-[#0F172A]">{plan.maxBranches}</dd></div><div className="flex justify-between gap-3"><dt>Programs</dt><dd className="font-semibold text-[#0F172A]">{plan.maxLoyaltyPrograms}</dd></div></dl></article>)}</div> : <EmptyState title="Plan guidance unavailable" description="Official plan details will appear here when plans are configured." />}</SectionCard>
        <SectionCard title="Billing History" description="View invoices and offline payments recorded by the platform team.">{invoices.length ? <InvoiceHistory invoices={invoices} /> : <EmptyState icon={<FileText className="h-5 w-5" />} title="No billing history yet." description="Invoices and payment records will appear here after the platform team records billing activity." />}</SectionCard>
      </div>
    </DashboardShell>
  );
}

function InvoiceHistory({ invoices }: { invoices: Array<{ id: number; invoiceNumber: string; invoiceDate: Date; dueDate: Date; amount: unknown; currency: string; payments: Array<{ amount: unknown }>; subscription: { subscriptionPlan: { name: string } } }> }) {
  return <><div className="hidden lg:block"><DataTable><DataTableHeader><tr>{["Invoice Number", "Date", "Amount", "Status"].map((heading) => <DataTableHeadCell key={heading}>{heading}</DataTableHeadCell>)}</tr></DataTableHeader><DataTableBody>{invoices.map((invoice) => { const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0); return <tr key={invoice.id}><DataTableCell><div><p className="font-semibold text-[#0F172A]">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-[#64748B]">{invoice.subscription.subscriptionPlan.name}</p></div></DataTableCell><DataTableCell>{formatDate(invoice.invoiceDate)}</DataTableCell><DataTableCell><div><p>{formatMoney(invoice.amount, invoice.currency)}</p><p className="mt-1 text-xs text-[#64748B]">Paid: {formatMoney(paid, invoice.currency)}</p></div></DataTableCell><DataTableCell><InvoiceBadge status={getInvoiceDisplayStatus(invoice)} /></DataTableCell></tr>; })}</DataTableBody></DataTable></div><div className="grid gap-3 lg:hidden">{invoices.map((invoice) => { const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0); return <article key={invoice.id} className="rounded-md border border-[#E2E8F0] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0F172A]">{invoice.invoiceNumber}</p><p className="mt-1 text-sm text-[#64748B]">{invoice.subscription.subscriptionPlan.name}</p></div><InvoiceBadge status={getInvoiceDisplayStatus(invoice)} /></div><div className="mt-4 grid gap-2 text-sm text-[#475569]"><p>Date: {formatDate(invoice.invoiceDate)}</p><p>Due: {formatDate(invoice.dueDate)}</p><p>Amount: {formatMoney(invoice.amount, invoice.currency)}</p><p>Paid: {formatMoney(paid, invoice.currency)}</p></div></article>; })}</div></>;
}
function BillingAlerts({ branchTone, programTone, overdueInvoices, daysRemaining, subscriptionStatus }: { branchTone: UsageTone; programTone: UsageTone; overdueInvoices: number; daysRemaining: number | null; subscriptionStatus: string }) { const alerts = [branchTone === "danger" ? "Branch limit reached. Upgrade your plan before adding another branch." : branchTone === "warning" ? "Branch usage is close to your current plan limit." : null, programTone === "danger" ? "Program limit reached. Upgrade your plan before creating another loyalty program." : programTone === "warning" ? "Program usage is close to your current plan limit." : null, overdueInvoices > 0 ? `${overdueInvoices} overdue invoice${overdueInvoices === 1 ? "" : "s"} need attention.` : null, daysRemaining !== null && daysRemaining <= 14 ? "Subscription renewal is approaching." : null, subscriptionStatus !== "ACTIVE" && subscriptionStatus !== "TRIAL" ? "Subscription is inactive. Contact LoyaltyBase support." : null].filter(Boolean); if (!alerts.length) return null; return <SectionCard title="Billing Alerts" description="Actionable billing items that may need attention."><div className="grid gap-3">{alerts.map((alert) => <div key={alert} className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{alert}</div>)}</div></SectionCard>; }
type UsageTone = "success" | "warning" | "danger" | "neutral";
function usageTone(used: number, limit: number): UsageTone { if (limit <= 0) return "neutral"; if (used >= limit) return "danger"; if (used / limit >= 0.8) return "warning"; return "success"; }
function UsageCard({ label, used, limit, tone }: { label: string; used: number; limit: number; tone: UsageTone }) { const barClassName = tone === "danger" ? "bg-red-600" : tone === "warning" ? "bg-amber-500" : tone === "success" ? "bg-emerald-600" : "bg-[#F97316]"; return <div className="rounded-md border border-[#E2E8F0] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#0F172A]">{label}</h3><p className="mt-1 text-sm text-[#64748B]">{limit > 0 ? `${used} / ${limit}` : `${used} used`}</p></div>{tone === "danger" ? <StatusBadge tone="danger">At limit</StatusBadge> : tone === "warning" ? <StatusBadge tone="warning">Near limit</StatusBadge> : <StatusBadge tone="success">Healthy</StatusBadge>}</div><ProgressBar value={used} max={limit || Math.max(used, 1)} label={`${label}: ${used} of ${limit || used}`} className="mt-4" barClassName={barClassName} /></div>; }
function SubscriptionBadge({ status }: { status: string }) { return status === "ACTIVE" ? <StatusBadge tone="success">Active</StatusBadge> : status === "TRIAL" ? <StatusBadge tone="warning">Trial</StatusBadge> : <StatusBadge tone="danger">{subscriptionStatusLabels[status as keyof typeof subscriptionStatusLabels] ?? status}</StatusBadge>; }
function HealthRow({ label, value }: { label: string; value: ReactNode }) { return <div className="flex items-center justify-between gap-3 rounded-md border border-[#E2E8F0] bg-white px-3 py-3"><span className="text-sm text-[#64748B]">{label}</span><span className="text-right text-sm font-semibold text-[#0F172A]">{value}</span></div>; }
function Info({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) { return <div className={`min-w-0 rounded-md border border-[#E2E8F0] bg-white p-4 ${className}`}><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><div className="mt-2 break-words text-sm font-semibold text-[#0F172A]">{value}</div></div>; }



