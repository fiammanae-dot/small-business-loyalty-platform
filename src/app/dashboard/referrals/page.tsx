import Link from "next/link";
import type React from "react";
import type { Prisma, ReferralRewardStatus, ReferralStatus } from "@prisma/client";
import { ArrowLeft, ArrowRight, ChevronRight, Gift, HelpCircle, Search, Share2, Sparkles, Trophy, Users } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { Avatar, MetricCard } from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const referralStatuses = ["PENDING", "QUALIFIED", "REJECTED", "EXPIRED"] as const;

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; reward?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const selectedStatus = referralStatuses.includes(params.status as (typeof referralStatuses)[number])
    ? (params.status as ReferralStatus)
    : undefined;
  const search = params.search?.trim();
  const rewardStatus = ["PENDING", "GRANTED", "CANCELLED"].includes(params.reward ?? "")
    ? (params.reward as ReferralRewardStatus)
    : undefined;
  const where: Prisma.ReferralWhereInput = {
    businessId: user.businessId,
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(rewardStatus ? { rewards: { some: { status: rewardStatus } } } : {}),
    ...(search
      ? {
          OR: [
            { referralCode: { contains: search, mode: "insensitive" } },
            { rejectionReason: { contains: search, mode: "insensitive" } },
            {
              referrerMembership: {
                is: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                    { normalizedPhone: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
            {
              referredMembership: {
                is: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                    { normalizedPhone: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [referrals, allReferrals, topReferrers, rewardSummary] = await Promise.all([
    prisma.referral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        referrerMembership: true,
        referredMembership: true,
        referredGlobalCustomer: true,
        referredFirstStampBranch: true,
        rewards: { include: { loyaltyProgram: true }, orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.referral.findMany({
      where: { businessId: user.businessId },
      select: {
        status: true,
        referrerMembershipId: true,
        referredMembershipId: true,
        firstStampTransactionId: true,
        rewards: { select: { bonusStamps: true, status: true } },
      },
    }),
    prisma.referral.groupBy({
      by: ["referrerMembershipId"],
      where: { businessId: user.businessId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.referralReward.aggregate({
      where: { businessId: user.businessId },
      _sum: { bonusStamps: true },
      _count: { id: true },
    }),
  ]);

  const referrerIds = topReferrers.map((row) => row.referrerMembershipId);
  const referrerDetails = referrerIds.length
    ? await prisma.businessCustomerMembership.findMany({
        where: { businessId: user.businessId, id: { in: referrerIds } },
      })
    : [];
  const referrerById = new Map(referrerDetails.map((membership) => [membership.id, membership]));
  const statusCounts = buildStatusCounts(allReferrals);

  const funnel = {
    invited: allReferrals.length,
    joined: allReferrals.filter((referral) => referral.referredMembershipId !== null).length,
    firstVisit: allReferrals.filter((referral) => referral.firstStampTransactionId !== null).length,
    qualified: statusCounts.QUALIFIED,
  };
  const qualifyRate = funnel.invited > 0 ? Math.round((funnel.qualified / funnel.invited) * 100) : 0;
  const maxReferrals = topReferrers[0]?._count.id ?? 0;
  const buildFilterHref = (next: { status?: string; reward?: string }) => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    const status = "status" in next ? next.status : params.status;
    const reward = "reward" in next ? next.reward : params.reward;
    if (status) query.set("status", status);
    if (reward) query.set("reward", reward);
    const qs = query.toString();
    return qs ? `/dashboard/referrals?${qs}` : "/dashboard/referrals";
  };

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Referral Center" hideWelcomeMessage>
      <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">Growth overview</h2>
            <p className="mt-0.5 text-[13px] text-[#7A8091]">Track referral growth, pending referrals, and earned rewards.</p>
          </div>
          <Link href="/dashboard" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition business-hover">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard href={buildFilterHref({ status: "" })} icon={<Users aria-hidden />} label="Total referrals" value={funnel.invited} helper="All time" />
          <MetricCard href={buildFilterHref({ status: "PENDING" })} icon={<Share2 aria-hidden />} label="Pending referrals" value={statusCounts.PENDING} helper="Awaiting first visit" tone={statusCounts.PENDING > 0 ? "warning" : "neutral"} />
          <MetricCard href={buildFilterHref({ status: "QUALIFIED" })} icon={<Trophy aria-hidden />} label="Qualified referrals" value={statusCounts.QUALIFIED} helper={`${qualifyRate}% qualify rate`} tone="success" />
          <MetricCard href={buildFilterHref({ reward: "GRANTED" })} icon={<Gift aria-hidden />} label="Rewards granted" value={rewardSummary._count.id} helper="Reward payouts" tone="success" />
          <MetricCard icon={<Sparkles aria-hidden />} label="Bonus stamps" value={rewardSummary._sum.bonusStamps ?? 0} helper="Total granted" />
        </div>
      </section>

      <ReferralFunnel funnel={funnel} qualifyRate={qualifyRate} />

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">Referrals <span className="font-normal text-[#9CA3AF]">· {referrals.length}</span></h2>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form className="relative min-w-0 flex-1 basis-56">
              <span className="sr-only">Search referrals</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
              <input name="search" defaultValue={params.search ?? ""} placeholder="Search customer, phone, code" className="h-9 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm" />
              <input type="hidden" name="status" value={params.status ?? ""} />
              <input type="hidden" name="reward" value={params.reward ?? ""} />
            </form>
            <FilterPill href={buildFilterHref({ status: "" })} active={!selectedStatus}>All</FilterPill>
            {referralStatuses.map((status) => (
              <FilterPill key={status} href={buildFilterHref({ status })} active={selectedStatus === status}>
                {friendlyStatus(status)}
              </FilterPill>
            ))}
          </div>

          {(search || rewardStatus) ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
              {search ? <span className="rounded-md bg-[#F1F3F5] px-2 py-1">Search: “{search}”</span> : null}
              {rewardStatus ? <span className="rounded-md bg-[#F1F3F5] px-2 py-1">Reward: {friendlyStatus(rewardStatus)}</span> : null}
              <Link href="/dashboard/referrals" className="font-semibold business-text">Clear all</Link>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2.5">
            {referrals.map((referral) => (
              <ReferralListRow key={referral.id} referral={referral} />
            ))}
            {referrals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] p-8 text-center">
                <p className="font-semibold text-[#111827]">No referrals match these filters.</p>
                <p className="mt-2 text-sm text-[#6B7280]">Referral records appear here after customers share their card referral link and staff enroll a referred customer.</p>
                <Link href="/dashboard/referrals" className="mt-4 inline-flex rounded-md business-button px-4 py-2 text-sm font-semibold text-white">Clear filters</Link>
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid min-w-0 gap-5">
          <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold tracking-tight text-[#171A21]">Top referrers</h2>
              <Trophy className="h-5 w-5 business-text" aria-hidden="true" />
            </div>
            <div className="mt-3 grid">
              {topReferrers.map((row, index) => {
                const membership = referrerById.get(row.referrerMembershipId);
                const name = membership ? customerName(membership) : `Customer #${row.referrerMembershipId}`;
                const width = maxReferrals > 0 ? Math.round((row._count.id / maxReferrals) * 100) : 0;
                return (
                  <Link
                    key={row.referrerMembershipId}
                    href={membership ? `/dashboard/customers/${membership.uuid}` : "/dashboard/referrals"}
                    className={`flex items-center gap-3 rounded-md px-2 py-2.5 transition business-hover ${index === 0 ? "" : "border-t border-[#F1F3F5]"}`}
                  >
                    <span className={`w-5 shrink-0 text-center text-sm font-bold ${rankColor(index)}`}>{index + 1}</span>
                    <Avatar name={name} className="h-8 w-8 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#111827]">{name}</p>
                      {index < 3 ? (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F1F3F5]">
                          <div className="h-full rounded-full business-button" style={{ width: `${width}%` }} />
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#111827]">{row._count.id}</span>
                  </Link>
                );
              })}
              {topReferrers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E5E7EB] p-6 text-center">
                  <p className="text-sm font-semibold text-[#111827]">No top referrers yet.</p>
                  <p className="mt-1 text-xs text-[#6B7280]">They appear once customers start sharing and qualifying referrals.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-[#F8FAFC] p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 business-text" aria-hidden="true" />
              <h2 className="text-sm font-bold tracking-tight text-[#171A21]">How referrals work</h2>
            </div>
            <ol className="mt-3 grid gap-2.5 text-sm text-[#475569]">
              <HowStep n={1} title="Invited" detail="Customer shares their referral link." />
              <HowStep n={2} title="Joined" detail="Staff enrolls the referred customer with that code." />
              <HowStep n={3} title="First visit" detail="Referral stays pending until the first valid stamp." />
              <HowStep n={4} title="Qualified" detail="Reward is granted after qualification." />
            </ol>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function ReferralFunnel({ funnel, qualifyRate }: { funnel: { invited: number; joined: number; firstVisit: number; qualified: number }; qualifyRate: number }) {
  const stages = [
    { label: "Invited", value: funnel.invited, final: false },
    { label: "Joined", value: funnel.joined, final: false },
    { label: "First visit", value: funnel.firstVisit, final: false },
    { label: "Qualified", value: funnel.qualified, final: true },
  ];
  const max = Math.max(funnel.invited, 1);
  return (
    <section className="min-w-0 rounded-xl border business-border-soft business-bg-soft p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-tight business-primary-strong">Referral funnel</h2>
        <p className="text-xs font-semibold business-primary-strong">{qualifyRate}% qualify rate</p>
      </div>
      <div className="mt-4 flex items-end gap-2 sm:gap-3">
        {stages.map((stage, index) => {
          const heightPercent = 45 + Math.round((stage.value / max) * 55);
          return (
            <div key={stage.label} className="flex min-w-0 flex-1 items-end gap-2 sm:gap-3">
              <div className="min-w-0 flex-1 text-center">
                <div
                  className={`flex items-center justify-center rounded-lg text-lg font-bold text-white ${stage.final ? "bg-emerald-600" : "business-button"}`}
                  style={{ height: `${Math.max(34, Math.round(heightPercent * 0.7))}px` }}
                >
                  {stage.value}
                </div>
                <p className={`mt-1.5 truncate text-[11px] font-medium ${stage.final ? "text-emerald-700" : "business-primary-strong"}`}>{stage.label}</p>
              </div>
              {index < stages.length - 1 ? <ChevronRight className="mb-6 h-4 w-4 shrink-0 business-primary opacity-60" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition ${
        active ? "business-button text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280] business-hover"
      }`}
    >
      {children}
    </Link>
  );
}

function HowStep({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full business-button text-[11px] font-bold text-white">{n}</span>
      <span><strong className="font-semibold text-[#111827]">{title}:</strong> {detail}</span>
    </li>
  );
}

function rankColor(index: number) {
  return index === 0 ? "text-[#E8B84B]" : index === 1 ? "text-[#94A3B8]" : index === 2 ? "text-[#B08D57]" : "text-[#9CA3AF]";
}

function ReferralListRow({ referral }: { referral: ReferralRow }) {
  const latestReward = referral.rewards[0] ?? null;
  const referred = referral.referredMembership ?? referral.referredGlobalCustomer;
  const referrerName = customerName(referral.referrerMembership);
  const referredName = referred ? customerName(referred) : null;
  const meta = [referral.referralCode, formatDate(referral.createdAt), referral.referredFirstStampBranch?.name]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/dashboard/referrals/${referral.uuid}`}
      className={`block rounded-lg border border-[#E5E7EB] p-3 transition business-hover ${borderAccent(referral.status)}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <Avatar name={referrerName} className="h-8 w-8 text-[11px]" />
          <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
          {referredName ? (
            <Avatar name={referredName} className="h-8 w-8 text-[11px]" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[#CBD5E1] text-xs text-[#9CA3AF]">?</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {referrerName} <span className="font-normal text-[#9CA3AF]">→</span>{" "}
            {referredName ?? <span className="font-normal text-[#9CA3AF]">awaiting first visit</span>}
          </p>
          <p className={`mt-0.5 truncate text-xs ${referral.rejectionReason ? "text-[#A32D2D]" : "text-[#9CA3AF]"}`}>
            {referral.rejectionReason ? `${referral.referralCode} · ${referral.rejectionReason}` : meta}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill status={referral.status} />
          {latestReward && latestReward.status === "GRANTED" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#854F0B]">
              <Gift className="h-3 w-3" aria-hidden="true" />+{latestReward.bonusStamps} stamp{latestReward.bonusStamps === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" aria-hidden="true" />
      </div>
    </Link>
  );
}

function borderAccent(status: string) {
  if (status === "QUALIFIED") return "border-l-[3px] border-l-emerald-500";
  if (status === "REJECTED" || status === "EXPIRED") return "border-l-[3px] border-l-red-500";
  return "border-l-[3px] business-border";
}

function StatusPill({ status }: { status: string }) {
  const classes =
    status === "QUALIFIED" || status === "GRANTED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED"
        ? "bg-red-50 text-red-700"
        : "bg-orange-50 business-bg-soft business-primary-strong";
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{friendlyStatus(status)}</span>;
}

function friendlyStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function customerName(customer: { firstName: string; lastName: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

function buildStatusCounts(referrals: Array<{ status: ReferralStatus; rewards: Array<{ bonusStamps: number; status: string }> }>) {
  return {
    PENDING: referrals.filter((referral) => referral.status === "PENDING").length,
    QUALIFIED: referrals.filter((referral) => referral.status === "QUALIFIED").length,
    REJECTED: referrals.filter((referral) => referral.status === "REJECTED").length,
    EXPIRED: referrals.filter((referral) => referral.status === "EXPIRED").length,
  };
}

type ReferralRow = Prisma.ReferralGetPayload<{
  include: {
    referrerMembership: true;
    referredMembership: true;
    referredGlobalCustomer: true;
    referredFirstStampBranch: true;
    rewards: { include: { loyaltyProgram: true } };
    events: true;
  };
}>;







