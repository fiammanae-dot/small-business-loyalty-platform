import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { formatMoney, getInvoiceDisplayStatus } from "@/lib/billing";
import { formatBillingCycle } from "@/lib/subscription-plans";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels, roleLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { toggleBusinessStatusAction } from "@/app/platform/businesses/actions";

export default async function BusinessDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireRole("PLATFORM_OWNER");
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { uuid: id },
    include: {
      branding: true,
      branches: { orderBy: { createdAt: "asc" } },
      users: { where: { role: "BUSINESS_OWNER" }, orderBy: { createdAt: "asc" } },
      subscriptions: {
        where: { status: { in: ["TRIAL", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { subscriptionPlan: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          payments: true,
          subscription: { include: { subscriptionPlan: true } },
        },
      },
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

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title={business.name}>
      {qs.error || qs.success ? <p className={`rounded-md border px-3 py-2 text-sm ${qs.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{qs.error ?? qs.success}</p> : null}

      <div className="grid max-w-full min-w-0 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Link href="/platform/businesses" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316]">
          Back to businesses
        </Link>
        <Link href={`/platform/businesses/${business.uuid}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white hover:bg-orange-600">
          Edit business
        </Link>
        <form action={toggleBusinessStatusAction} className="min-w-0">
          <CsrfInput scope="platform:businesses" />
          <input type="hidden" name="businessId" value={business.id} />
          <input type="hidden" name="businessUuid" value={business.uuid} />
          <input type="hidden" name="nextStatus" value={nextStatus} />
          <ConfirmSubmitButton
            message={nextStatus === "ACTIVE" ? "Enable this business and restore access?" : "Disable this business? Owners, staff, scanners, and customer activity may be blocked."}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] hover:border-[#F97316] hover:text-[#F97316] sm:w-auto"
          >
            {nextStatus === "ACTIVE" ? "Enable business" : "Disable business"}
          </ConfirmSubmitButton>
        </form>
      </div>

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
              <InfoRow label="Admin" value={activeSupportSession.adminUser.name} />
              <InfoRow label="Mode" value={activeSupportSession.readOnly ? "Read-only" : "Read/write"} />
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">No active support session.</p>
          )}
          {lastSupportSession ? (
            <div className="mt-4 border-t border-[#E5E7EB] pt-4">
              <InfoRow label="Last support session" value={`${lastSupportSession.status} - ${formatDate(lastSupportSession.startedAt)}`} />
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
