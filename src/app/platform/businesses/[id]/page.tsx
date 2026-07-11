import Link from "next/link";
import { notFound } from "next/navigation";
import type { SubscriptionStatus } from "@prisma/client";
import { Archive, ChevronRight, Pencil, Power, RotateCcw } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatMoney, getInvoiceDisplayStatus } from "@/lib/billing";
import { formatBillingCycle } from "@/lib/subscription-plans";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels, roleLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { getSubscriptionRemainingDays, getTrialRemainingDays } from "@/lib/subscriptions";
import { archiveBusinessAction, restoreBusinessAction, toggleBusinessStatusAction } from "@/app/platform/businesses/actions";
import { extendSubscriptionAction, startTrialAction, updateSubscriptionStatusAction } from "@/app/platform/subscriptions/actions";

export default async function BusinessDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireRole("PLATFORM_OWNER");
  const { id } = await params;
  const qs = await searchParams;
  const business = await prisma.business.findUnique({
    where: { uuid: id },
    include: {
      branding: true,
      branches: { orderBy: { createdAt: "asc" } },
      users: { where: { role: "BUSINESS_OWNER" }, orderBy: { createdAt: "asc" } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          subscriptionPlan: true,
          auditLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          payments: true,
          subscription: { include: { subscriptionPlan: true } },
        },
      },
      supportSessions: {
        orderBy: { startedAt: "desc" },
        take: 3,
        include: {
          adminUser: { select: { name: true, email: true } },
          _count: { select: { activities: true } },
        },
      },
      archivedBy: { select: { name: true, email: true } },
    },
  });

  if (!business) notFound();

  const nextStatus = business.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const branding = business.branding;
  const owner = business.users[0];
  const currentSubscription = business.subscriptions[0];
  const lifetimeRevenue = business.invoices.reduce((sum, invoice) => sum + invoice.payments.reduce((paid, payment) => paid + Number(payment.amount), 0), 0);
  const now = new Date();
  const activeSupportSession = business.supportSessions.find((session) => session.status === "ACTIVE" && !session.endedAt && session.expiresAt > now);
  const lastSupportSession = business.supportSessions[0] ?? null;
  const planName = currentSubscription?.subscriptionPlan.name ?? "Unassigned Plan";
  const remainingDays = currentSubscription ? getSubscriptionRemainingDays(currentSubscription) : null;
  const trialDays = currentSubscription ? getTrialRemainingDays(currentSubscription) : null;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title={business.name}>
      {qs.error || qs.success ? <p className={`rounded-md border px-3 py-2 text-sm ${qs.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{qs.error ?? qs.success}</p> : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#6B7280]">
          <Link href="/platform/businesses" className="transition hover:text-[#F97316] hover:underline">
            Businesses
          </Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="text-[#111827]">{business.name}</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-2xl font-black tracking-tight text-[#111827] md:text-3xl">{business.name}</h1>
              <StatusBadge status={business.status} />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#6B7280]">{planName}</p>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Link href={`/platform/businesses/${business.uuid}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600">
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            {business.status === "ARCHIVED" ? (
              <form action={restoreBusinessAction} className="min-w-0">
                <CsrfInput scope="platform:businesses" />
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="businessUuid" value={business.uuid} />
                <ConfirmSubmitButton
                  message="Restore this business? It returns as Inactive until you re-enable it from this page."
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316] sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </ConfirmSubmitButton>
              </form>
            ) : (
              <form action={toggleBusinessStatusAction} className="min-w-0">
                <CsrfInput scope="platform:businesses" />
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="businessUuid" value={business.uuid} />
                <input type="hidden" name="nextStatus" value={nextStatus} />
                <ConfirmSubmitButton
                  message={nextStatus === "ACTIVE" ? "Enable this business and restore access?" : "Disable this business? Owners, staff, scanners, and customer activity may be blocked."}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316] sm:w-auto"
                >
                  <Power className="h-4 w-4" />
                  {nextStatus === "ACTIVE" ? "Enable" : "Disable"}
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        </div>

        {business.status === "ARCHIVED" ? (
          <div className="mt-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-sm text-[#374151]">
            <p className="font-semibold text-[#111827]">This business is archived.</p>
            <p className="mt-1">
              Archived {business.archivedAt ? formatDateTime(business.archivedAt) : "-"}
              {business.archivedBy ? ` by ${business.archivedBy.name}` : ""}.
            </p>
            {business.archiveReason ? <p className="mt-1">Reason: {business.archiveReason}</p> : null}
            <p className="mt-2 text-xs text-[#6B7280]">
              Data is preserved (subscriptions, invoices, customers, audit history). Use Restore above to bring it back.
            </p>
          </div>
        ) : (
          <details className="mt-4 rounded-md border border-[#E5E7EB] bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]">
              <Archive className="h-4 w-4" />
              Archive this business
            </summary>
            <div className="border-t border-[#E5E7EB] p-4">
              <p className="text-sm text-[#6B7280]">
                Archiving hides this business from active lists and blocks all staff/owner logins. It does not delete any
                data - subscriptions, invoices, customers, and audit history are preserved, and it can be restored later.
              </p>
              <form action={archiveBusinessAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <CsrfInput scope="platform:businesses" />
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="businessUuid" value={business.uuid} />
                <label className="flex-1 text-sm font-medium text-[#171A21]">
                  Reason for archiving
                  <RequiredMark />
                  <textarea
                    name="archiveReason"
                    required
                    rows={2}
                    placeholder="e.g. Requested by owner, non-payment, closed business"
                    className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <ConfirmSubmitButton
                  message="Archive this business? This blocks all staff/owner logins immediately. Data is preserved and this can be undone with Restore."
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:w-auto"
                  confirmLabel="Archive"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </ConfirmSubmitButton>
              </form>
            </div>
          </details>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Business profile">
          <InfoRow label="Type" value={businessTypeLabels[business.businessType]} />
          <InfoRow label="Status" value={<StatusBadge status={business.status} />} />
          <InfoRow label="Subscription" value={business.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned"} />
          <InfoRow label="Created" value={formatDate(business.createdAt)} />
        </InfoCard>
        <InfoCard title="Branding colors">
          <ColorRow label="Primary" value={branding?.primaryColor ?? "#F97316"} />
          <ColorRow label="Secondary" value={branding?.secondaryColor ?? "#FDBA74"} />
          <ColorRow label="Background" value={branding?.backgroundColor ?? "#FFFFFF"} />
          <ColorRow label="Text" value={branding?.textColor ?? "#111827"} />
          <ColorRow label="Button" value={branding?.buttonColor ?? "#F97316"} />
        </InfoCard>
        <InfoCard title="Support Access">
          {activeSupportSession ? (
            <>
              <InfoRow label="Active session" value={`Started ${formatDate(activeSupportSession.startedAt)}`} />
              <InfoRow label="Expires" value={formatDate(activeSupportSession.expiresAt)} />
              <InfoRow label="Admin" value={activeSupportSession.adminUser.name ?? activeSupportSession.adminUser.email} />
              <InfoRow label="Mode" value={activeSupportSession.readOnly ? "Read-only" : "Read/write"} />
              <InfoRow label="Activities" value={activeSupportSession._count.activities.toString()} />
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">No active support session.</p>
          )}
          {lastSupportSession ? (
            <div className="mt-4 border-t border-[#E5E7EB] pt-4">
              <InfoRow label="Last support session" value={`${lastSupportSession.status} - ${formatDate(lastSupportSession.startedAt)}`} />
              <InfoRow label="Admin" value={lastSupportSession.adminUser.name ?? lastSupportSession.adminUser.email} />
              <InfoRow label="Activities" value={lastSupportSession._count.activities.toString()} />
              <InfoRow label="Reason" value={lastSupportSession.reason} />
            </div>
          ) : null}
          <Link href={`/platform/businesses/${business.uuid}/support-session`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
            Open Support Session
          </Link>
        </InfoCard>        <InfoCard title="Business owner user">
          {owner ? (
            <>
              <InfoRow label="Name" value={owner.name} />
              <InfoRow label="Email" value={owner.email} />
              <InfoRow label="Role" value={roleLabels[owner.role]} />
              <InfoRow label="Status" value={<StatusBadge status={owner.status} />} />
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">No business owner assigned.</p>
          )}
        </InfoCard>
      </section>

      <section className="max-w-full min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Billing Tab</p>
            <h2 className="text-lg font-semibold text-[#111827]">Business billing profile</h2>
          </div>
          <Link href="/platform/billing-center" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
            Open Billing Center
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-6">
          <InfoMetric label="Current Plan" value={currentSubscription?.subscriptionPlan.name ?? "Unassigned"} />
          <InfoMetric label="Billing Cycle" value={currentSubscription ? formatBillingCycle(currentSubscription.billingCycle) : "Unassigned"} />
          <InfoMetric label="Subscription Status" value={currentSubscription?.status.replaceAll("_", " ") ?? "Unassigned"} />
          <InfoMetric label="Renewal Date" value={currentSubscription?.renewalDate ? formatDate(currentSubscription.renewalDate) : "-"} />
          <InfoMetric label="Lifetime Revenue" value={formatMoney(lifetimeRevenue)} />
          <InfoMetric label="Invoices" value={business.invoices.length.toString()} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Subscription summary</h3>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <InfoRow label="Plan" value={currentSubscription?.subscriptionPlan.name ?? "Unassigned"} />
              <InfoRow label="Status" value={currentSubscription ? <StatusBadge status={currentSubscription.status} /> : "Unassigned"} />
              <InfoRow label="Expiry Date" value={currentSubscription?.expiryDate ? formatDate(currentSubscription.expiryDate) : "-"} />
              <InfoRow label="Renewal Date" value={currentSubscription?.renewalDate ? formatDate(currentSubscription.renewalDate) : "-"} />
              <InfoRow label="Days Remaining" value={remainingDays === null ? "-" : `${remainingDays} day(s)`} />
              <InfoRow label="Trial" value={trialDays === null ? "No active trial" : `${trialDays} day(s) left`} />
            </dl>
            <div className="mt-4 border-t border-[#E5E7EB] pt-4">
              <h4 className="text-sm font-semibold text-[#111827]">Audit history</h4>
              <div className="mt-3 space-y-3">
                {currentSubscription?.auditLogs.length ? (
                  currentSubscription.auditLogs.map((log) => (
                    <div key={log.id} className="rounded-md border border-[#E5E7EB] bg-white p-3 text-sm">
                      <p className="font-semibold text-[#111827]">{log.action.replaceAll("_", " ").toLowerCase()}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        {formatDate(log.createdAt)} by {log.user?.name ?? log.user?.email ?? "System"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-[#E5E7EB] bg-white p-3 text-sm text-[#6B7280]">No subscription audit activity yet.</p>
                )}
              </div>
            </div>
          </div>
          {currentSubscription ? <SubscriptionActionsPanel subscriptionId={currentSubscription.id} /> : null}
        </div>
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Invoice History & Payment History</h3>
        <div className="mt-5 grid gap-3 md:hidden">
          {business.invoices.map((invoice) => {
            const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            const status = getInvoiceDisplayStatus(invoice).replaceAll("_", " ");
            return (
              <article key={invoice.id} className="rounded-md border border-[#E5E7EB] bg-white p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-[#111827]">{invoice.invoiceNumber}</p>
                    <p className="mt-1 break-words text-xs text-[#6B7280]">{invoice.subscription.subscriptionPlan.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-1 text-[11px] font-semibold uppercase text-[#6B7280]">{status}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <MobileDetail label="Due" value={formatDate(invoice.dueDate)} />
                  <MobileDetail label="Amount" value={formatMoney(invoice.amount, invoice.currency)} />
                  <MobileDetail label="Paid" value={formatMoney(paid, invoice.currency)} />
                  <MobileDetail label="Status" value={status} />
                </dl>
              </article>
            );
          })}
          {business.invoices.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] py-8 text-center text-sm text-[#6B7280]">No invoice history yet.</p> : null}
        </div>
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Invoice", "Plan", "Due Date", "Amount", "Paid", "Status"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {business.invoices.map((invoice) => {
                const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
                return (
                  <tr key={invoice.id}>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{invoice.invoiceNumber}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{invoice.subscription.subscriptionPlan.name}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(invoice.dueDate)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(invoice.amount, invoice.currency)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(paid, invoice.currency)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{getInvoiceDisplayStatus(invoice).replaceAll("_", " ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {business.invoices.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No invoice history yet.</p> : null}
        </div>
      </section>

      <section className="max-w-full min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Branches</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {business.branches.map((branch) => (
            <article key={branch.id} className="min-w-0 rounded-md border border-[#E5E7EB] p-4">
              <h3 className="break-words font-semibold text-[#111827]">{branch.name}</h3>
              <p className="mt-2 break-words text-sm text-[#6B7280]">{branch.address}</p>
              <p className="mt-1 break-words text-sm text-[#6B7280]">
                {branch.city}, {branch.country}
              </p>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3 md:p-4">
      <p className="break-words text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] md:text-xs">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-[#111827] md:text-lg">{value}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5">
      <h2 className="break-words text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-4 min-w-0 space-y-3">{children}</div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}

function ColorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 break-all text-sm font-semibold text-[#111827]">
        <span className="h-5 w-5 shrink-0 rounded border border-[#E5E7EB]" style={{ backgroundColor: value }} />
        {value}
      </span>
    </div>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

function SubscriptionActionsPanel({ subscriptionId }: { subscriptionId: number }) {
  return (
    <aside className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6B7280]">Actions</p>
      <h3 className="mt-2 text-lg font-semibold text-[#111827]">Subscription lifecycle</h3>
      <div className="mt-4 grid gap-2">
        <SubscriptionStatusButton subscriptionId={subscriptionId} nextStatus="ACTIVE" label="Activate" />
        <SubscriptionStatusButton subscriptionId={subscriptionId} nextStatus="SUSPENDED" label="Suspend" />
        <SubscriptionStatusButton subscriptionId={subscriptionId} nextStatus="CANCELLED" label="Cancel" />
      </div>
      <div className="mt-5 grid gap-3 border-t border-[#E5E7EB] pt-5">
        <form action={startTrialAction} className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
          <CsrfInput scope="platform:subscriptions" />
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <label className="text-sm font-semibold text-[#111827]">
            Start Trial
            <div className="mt-2 flex gap-2">
              <input name="days" type="number" min="1" max="365" defaultValue="14" className="h-10 w-24 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm" />
              <button type="submit" className="h-10 flex-1 rounded-md border border-[#F97316] px-3 text-sm font-semibold text-[#F97316] transition hover:bg-orange-50">
                Apply
              </button>
            </div>
          </label>
        </form>
        <form action={extendSubscriptionAction} className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
          <CsrfInput scope="platform:subscriptions" />
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <label className="text-sm font-semibold text-[#111827]">
            Extend
            <div className="mt-2 flex gap-2">
              <input name="days" type="number" min="1" max="3650" defaultValue="30" className="h-10 w-24 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm" />
              <button type="submit" className="h-10 flex-1 rounded-md bg-[#F97316] px-3 text-sm font-semibold text-white transition hover:bg-orange-600">
                Apply
              </button>
            </div>
          </label>
        </form>
      </div>
    </aside>
  );
}

function SubscriptionStatusButton({ subscriptionId, nextStatus, label }: { subscriptionId: number; nextStatus: SubscriptionStatus; label: string }) {
  return (
    <form action={updateSubscriptionStatusAction}>
      <CsrfInput scope="platform:subscriptions" />
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="nextStatus" value={nextStatus} />
      <ConfirmSubmitButton
        message={subscriptionConfirmationMessage(nextStatus)}
        className="min-h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
      >
        {label}
      </ConfirmSubmitButton>
    </form>
  );
}

function subscriptionConfirmationMessage(nextStatus: SubscriptionStatus) {
  if (nextStatus === "ACTIVE") return "Activate this subscription now?";
  if (nextStatus === "SUSPENDED") return "Suspend this subscription? Business operations may be restricted.";
  if (nextStatus === "CANCELLED") return "Cancel this subscription? This may block business access and billing lifecycle changes.";
  return "Update this subscription status?";
}
