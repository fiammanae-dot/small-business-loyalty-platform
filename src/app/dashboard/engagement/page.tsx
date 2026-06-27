import Link from "next/link";
import type { EngagementEventType } from "@prisma/client";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { engagementEventLabels, isMarketingEngagement } from "@/lib/engagement";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const eventTypes = [
  "REWARD_READY",
  "NEAR_REWARD",
  "BIRTHDAY",
  "INACTIVE_30_DAYS",
  "INACTIVE_60_DAYS",
  "INACTIVE_90_DAYS",
  "WELCOME_CUSTOMER",
  "REWARD_REDEEMED",
] as const;

export default async function EngagementCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ eventType?: string; branch?: string; program?: string; from?: string; to?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const eventType = eventTypes.includes(params.eventType as EngagementEventType) ? params.eventType as EngagementEventType : undefined;
  const branchId = params.branch ? Number(params.branch) : undefined;
  const programId = params.program ? Number(params.program) : undefined;
  const from = params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined;
  const to = params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [branches, programs, events, rewardReady, nearReward, birthdays, inactive, recentlyRedeemed] = await Promise.all([
    prisma.branch.findMany({ where: { businessId: user.businessId }, orderBy: { name: "asc" } }),
    prisma.loyaltyProgram.findMany({ where: { businessId: user.businessId }, orderBy: { name: "asc" } }),
    prisma.engagementEvent.findMany({
      where: {
        businessId: user.businessId,
        ...(eventType ? { eventType } : {}),
        ...(from || to ? { eventDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        customer: {
          businessId: user.businessId,
          ...(branchId ? { createdBranchId: branchId } : {}),
          ...(programId
            ? { programMemberships: { some: { loyaltyProgramId: programId } } }
            : {}),
        },
      },
      orderBy: { eventDate: "desc" },
      take: 100,
      include: {
        customer: {
          include: {
            globalCustomer: true,
            createdBranch: true,
            programMemberships: { include: { loyaltyProgram: true } },
          },
        },
      },
    }),
    prisma.engagementEvent.count({ where: { businessId: user.businessId, eventType: "REWARD_READY", status: "ACTIVE" } }),
    prisma.engagementEvent.count({ where: { businessId: user.businessId, eventType: "NEAR_REWARD", status: "ACTIVE" } }),
    prisma.engagementEvent.count({ where: { businessId: user.businessId, eventType: "BIRTHDAY", eventDate: { gte: monthStart } } }),
    prisma.engagementEvent.count({
      where: { businessId: user.businessId, eventType: { in: ["INACTIVE_30_DAYS", "INACTIVE_60_DAYS", "INACTIVE_90_DAYS"] }, status: "ACTIVE" },
    }),
    prisma.engagementEvent.count({ where: { businessId: user.businessId, eventType: "REWARD_REDEEMED" } }),
  ]);

  const visibleEvents = events.filter((event) => !isMarketingEngagement(event.eventType) || event.customer.marketingConsent);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Engagement Center">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Reward Ready Customers" value={rewardReady} />
        <Metric label="Near Reward Customers" value={nearReward} />
        <Metric label="Birthday Customers" value={birthdays} />
        <Metric label="Inactive Customers" value={inactive} />
        <Metric label="Recently Redeemed" value={recentlyRedeemed} />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Filters</h2>
        <form className="mt-5 grid gap-3 md:grid-cols-5">
          <select name="eventType" defaultValue={params.eventType ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
            <option value="">All event types</option>
            {eventTypes.map((type) => <option key={type} value={type}>{engagementEventLabels[type]}</option>)}
          </select>
          <SearchableCombobox
            label="Branch"
            name="branch"
            defaultValue={params.branch ?? ""}
            placeholder="All branches"
            emptyLabel="No branches found."
            options={[
              { value: "", label: "All branches", description: "Show engagement across the business" },
              ...branches.map((branch) => ({ value: branch.id.toString(), label: branch.name, description: branch.status === "ACTIVE" ? "Active branch" : "Inactive branch" })),
            ]}
          />
          <SearchableCombobox
            label="Program"
            name="program"
            defaultValue={params.program ?? ""}
            placeholder="All programs"
            emptyLabel="No programs found."
            options={[
              { value: "", label: "All programs", description: "Show every loyalty program" },
              ...programs.map((program) => ({
                value: program.id.toString(),
                label: program.name,
                description: program.rewardName,
                badge: program.active ? "Active" : "Inactive",
              })),
            ]}
          />
          <input name="from" type="date" defaultValue={params.from ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" />
          <input name="to" type="date" defaultValue={params.to ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" />
          <button className="h-10 rounded-md border border-[#F97316] px-4 text-sm font-semibold business-primary md:col-span-5">Apply filters</button>
        </form>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Engagement events</h2>
        <div className="mt-5 grid gap-3 lg:hidden">
          {visibleEvents.map((event) => {
            const customerName = `${event.customer.globalCustomer.firstName} ${event.customer.globalCustomer.lastName ?? ""}`.trim();
            const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata : {};
            const programName = String(metadata.programName ?? event.customer.programMemberships[0]?.loyaltyProgram.name ?? "-");
            return (
              <article key={event.id} className="rounded-md border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#111827]">{engagementEventLabels[event.eventType]}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">{customerName}</p>
                  </div>
                  <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold business-primary">{event.status.toLowerCase()}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
                  <p>Branch: {event.customer.createdBranch?.name ?? "-"}</p>
                  <p>Program: {programName}</p>
                  <p>Date: {formatDateTime(event.eventDate)}</p>
                </div>
                <Link href={`/dashboard/engagement/${event.uuid}`} className="mt-4 inline-flex font-semibold business-primary">View</Link>
              </article>
            );
          })}
        </div>
        <div className="mt-5 hidden lg:block">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Event", "Customer", "Branch", "Program", "Status", "Event Date", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => {
                const customerName = `${event.customer.globalCustomer.firstName} ${event.customer.globalCustomer.lastName ?? ""}`.trim();
                const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata : {};
                const programName = String(metadata.programName ?? event.customer.programMemberships[0]?.loyaltyProgram.name ?? "-");
                return (
                  <tr key={event.id}>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{engagementEventLabels[event.eventType]}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{customerName}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.customer.createdBranch?.name ?? "-"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{programName}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.status.toLowerCase()}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDateTime(event.eventDate)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4">
                      <Link href={`/dashboard/engagement/${event.uuid}`} className="font-semibold business-primary">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleEvents.length === 0 ? <EmptyState title="No engagement events match these filters." className="my-4" /> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <MetricCard label={label} value={value} className="h-full" />;
}

