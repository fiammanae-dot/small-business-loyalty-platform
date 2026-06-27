import Link from "next/link";
import type { Prisma, ReferralRewardStatus, ReferralStatus } from "@prisma/client";
import { Gift, Search, Share2, Sparkles, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { MetricCard, StatusBadge } from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate, formatDateTime } from "@/lib/format";
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
                    { globalCustomer: { is: { firstName: { contains: search, mode: "insensitive" } } } },
                    { globalCustomer: { is: { lastName: { contains: search, mode: "insensitive" } } } },
                    { globalCustomer: { is: { phone: { contains: search, mode: "insensitive" } } } },
                    { globalCustomer: { is: { normalizedPhone: { contains: search, mode: "insensitive" } } } },
                  ],
                },
              },
            },
            {
              referredMembership: {
                is: {
                  OR: [
                    { globalCustomer: { is: { firstName: { contains: search, mode: "insensitive" } } } },
                    { globalCustomer: { is: { lastName: { contains: search, mode: "insensitive" } } } },
                    { globalCustomer: { is: { phone: { contains: search, mode: "insensitive" } } } },
                    { globalCustomer: { is: { normalizedPhone: { contains: search, mode: "insensitive" } } } },
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
        referrerMembership: { include: { globalCustomer: true } },
        referredMembership: { include: { globalCustomer: true } },
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
        rewards: { select: { bonusStamps: true, status: true } },
      },
    }),
    prisma.referral.groupBy({
      by: ["referrerMembershipId"],
      where: { businessId: user.businessId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
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
        include: { globalCustomer: true },
      })
    : [];
  const referrerById = new Map(referrerDetails.map((membership) => [membership.id, membership]));
  const statusCounts = buildStatusCounts(allReferrals);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Referral Center" hideWelcomeMessage>
      <section className="min-w-0 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold business-primary">Growth</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#111827]">Referral Center</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Track referral growth, pending referrals and earned rewards.</p>
          </div>
          <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
            Back to dashboard
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Kpi href="/dashboard/referrals?status=PENDING" icon={Share2} label="Pending referrals" value={statusCounts.PENDING.toString()} />
          <Kpi href="/dashboard/referrals?status=QUALIFIED" icon={Trophy} label="Qualified referrals" value={statusCounts.QUALIFIED.toString()} tone="success" />
          <Kpi href="/dashboard/referrals?reward=GRANTED" icon={Gift} label="Rewards granted" value={rewardSummary._count.id.toString()} tone="success" />
          <Kpi href="/dashboard/referrals?status=REJECTED" icon={Users} label="Rejected referrals" value={statusCounts.REJECTED.toString()} tone="warning" />
          <Kpi href="/dashboard/referrals" icon={Sparkles} label="Bonus stamps granted" value={(rewardSummary._sum.bonusStamps ?? 0).toString()} />
        </div>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(620px,1fr)_minmax(280px,360px)] 2xl:grid-cols-[minmax(760px,1fr)_minmax(320px,380px)]">
        <div className="min-w-0 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Referral List</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Showing {referrals.length} referral{referrals.length === 1 ? "" : "s"}</p>
            </div>
            <form className="grid min-w-0 gap-2 md:grid-cols-[minmax(260px,1fr)_150px_140px_auto] xl:grid-cols-[minmax(320px,1fr)_150px_140px_auto]">
              <label className="relative">
                <span className="sr-only">Search referrals</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
                <input name="search" defaultValue={params.search ?? ""} placeholder="Search customer, phone, code" className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm" />
              </label>
              <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
                <option value="">All statuses</option>
                {referralStatuses.map((status) => <option key={status} value={status}>{friendlyStatus(status)}</option>)}
              </select>
              <select name="reward" defaultValue={params.reward ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
                <option value="">All rewards</option>
                <option value="GRANTED">Granted</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="flex min-w-0 gap-2">
                <button type="submit" className="h-10 rounded-md business-button px-4 text-sm font-semibold text-white">Apply</button>
                <Link href="/dashboard/referrals" className="inline-flex h-10 items-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">Clear</Link>
              </div>
            </form>
          </div>

          <div className="mt-5 grid gap-3">
            {referrals.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} />
            ))}
            {referrals.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E7EB] p-8 text-center">
                <p className="font-semibold text-[#111827]">No referrals match these filters.</p>
                <p className="mt-2 text-sm text-[#6B7280]">Referral records appear here after customers share their card referral link and staff enroll a referred customer.</p>
                <Link href="/dashboard/referrals" className="mt-4 inline-flex rounded-md business-button px-4 py-2 text-sm font-semibold text-white">Clear filters</Link>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="grid min-w-0 gap-5">
          <section className="min-w-0 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Top Referrers</h2>
            <div className="mt-4 grid gap-3">
              {topReferrers.map((row) => {
                const membership = referrerById.get(row.referrerMembershipId);
                return (
                  <Link key={row.referrerMembershipId} href={membership ? `/dashboard/customers/${membership.uuid}` : "/dashboard/referrals"} className="min-w-0 rounded-md border border-[#E5E7EB] p-3 transition business-hover">
                    <p className="truncate font-semibold text-[#111827]" title={membership ? customerName(membership.globalCustomer) : `Customer #${row.referrerMembershipId}`}>{membership ? customerName(membership.globalCustomer) : `Customer #${row.referrerMembershipId}`}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{row._count.id} referral{row._count.id === 1 ? "" : "s"}</p>
                  </Link>
                );
              })}
              {topReferrers.length === 0 ? <p className="text-sm text-[#6B7280]">No referrers yet.</p> : null}
            </div>
          </section>

        </aside>
      </section>

      <section className="min-w-0 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">Growth Funnel</h2>
        <ol className="mt-4 grid min-w-0 gap-3 text-sm text-[#6B7280] md:grid-cols-2 xl:grid-cols-4">
          <li className="min-w-0 rounded-md bg-[#FAFAFA] p-3"><strong className="text-[#111827]">1.</strong> Invited: Customer shares referral link.</li>
          <li className="min-w-0 rounded-md bg-[#FAFAFA] p-3"><strong className="text-[#111827]">2.</strong> Joined: Staff enrolls the referred customer with that code.</li>
          <li className="min-w-0 rounded-md bg-[#FAFAFA] p-3"><strong className="text-[#111827]">3.</strong> First Visit: Referral stays pending until the first valid stamp.</li>
          <li className="min-w-0 rounded-md bg-[#FAFAFA] p-3"><strong className="text-[#111827]">4.</strong> Qualified / Reward Granted: Reward is granted automatically after qualification.</li>
        </ol>
      </section>
    </DashboardShell>
  );
}

function ReferralCard({ referral }: { referral: ReferralRow }) {
  const latestReward = referral.rewards[0] ?? null;
  const referred = referral.referredMembership?.globalCustomer ?? referral.referredGlobalCustomer;

  return (
    <article className="min-w-0 rounded-md border border-[#E5E7EB] p-4 transition business-hover">
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={referral.status} />
            <span className="rounded-md bg-orange-50 business-bg-soft px-2 py-1 text-xs font-semibold business-primary-strong">{referral.referralCode}</span>
          </div>
          <h3 className="mt-3 break-words text-lg font-semibold text-[#111827]">
            {customerName(referral.referrerMembership.globalCustomer)} referred {referred ? customerName(referred) : "a customer"}
          </h3>
          <dl className="mt-4 grid min-w-0 gap-2 text-sm text-[#6B7280] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <ReferralMeta label="Created" value={formatDateTime(referral.createdAt)} />
            <ReferralMeta label="Qualified" value={referral.qualifiedAt ? formatDateTime(referral.qualifiedAt) : "-"} />
            <ReferralMeta label="Reward" value={latestReward ? `${latestReward.bonusStamps} stamp${latestReward.bonusStamps === 1 ? "" : "s"} - ${friendlyStatus(latestReward.status)}` : "-"} />
            <ReferralMeta label="First Visit" value={referral.qualifiedAt ? "Completed" : "Pending"} />
            <ReferralMeta label="Branch" value={referral.referredFirstStampBranch?.name ?? "-"} />
            <ReferralMeta label="Referrer" value={customerName(referral.referrerMembership.globalCustomer)} />
            <ReferralMeta label="Referred" value={referred ? customerName(referred) : "Pending"} />
          </dl>
          {referral.rejectionReason ? <p className="mt-2 text-sm font-semibold text-red-700">{referral.rejectionReason}</p> : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 2xl:justify-end">
          <Link href={`/dashboard/referrals/${referral.uuid}`} className="shrink-0 rounded-md business-button px-4 py-2 text-sm font-semibold text-white">View details</Link>
          <Link href={`/dashboard/customers/${referral.referrerMembership.uuid}`} className="shrink-0 rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">Referrer</Link>
          {referral.referredMembership ? (
            <Link href={`/dashboard/customers/${referral.referredMembership.uuid}`} className="shrink-0 rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">Referred</Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReferralMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[#FAFAFA] px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</dt>
      <dd className="mt-1 truncate font-medium text-[#111827]" title={value}>{value}</dd>
    </div>
  );
}
function Kpi({ href, icon: Icon, label, value, tone = "default" }: { href: string; icon: LucideIcon; label: string; value: string; tone?: "default" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "warning" ? "bg-orange-50 business-bg-soft text-orange-700" : "bg-orange-50 business-bg-soft business-primary";
  return (
    <Link href={href} className="rounded-md border border-[#E5E7EB] p-4 transition business-hover">
      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#111827]">{value}</p>
    </Link>
  );
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
    referrerMembership: { include: { globalCustomer: true } };
    referredMembership: { include: { globalCustomer: true } };
    referredGlobalCustomer: true;
    referredFirstStampBranch: true;
    rewards: { include: { loyaltyProgram: true } };
    events: true;
  };
}>;




