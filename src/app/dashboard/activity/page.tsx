import Link from "next/link";
import { ArrowLeft, Gift, Share2, TicketCheck, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ActivityCategory = "enrollments" | "stamps" | "rewards" | "referrals";

type ActivityItem = {
  category: ActivityCategory;
  title: string;
  meta: string;
  createdAt: Date;
  icon: LucideIcon;
  href?: string;
};

const activityFilters: Array<{ value: ActivityCategory | "all"; label: string; icon: LucideIcon }> = [
  { value: "all", label: "All activity", icon: Users },
  { value: "enrollments", label: "Enrollments", icon: UserPlus },
  { value: "stamps", label: "Stamps", icon: TicketCheck },
  { value: "rewards", label: "Rewards", icon: Gift },
  { value: "referrals", label: "Referrals", icon: Share2 },
];

const toneDotClass: Record<ActivityCategory, string> = {
  enrollments: "bg-[#F1EFE8] text-[#5F5E5A]",
  stamps: "business-bg-soft business-text",
  rewards: "bg-emerald-50 text-emerald-700",
  referrals: "bg-[#E6F1FB] text-[#185FA5]",
};

export default async function BusinessActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const selectedType: ActivityCategory | undefined = ["enrollments", "stamps", "rewards", "referrals"].includes(params.type ?? "")
    ? (params.type as ActivityCategory)
    : undefined;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const businessId = user.businessId;

  const [
    customerEnrollments,
    stampIssuance,
    rewardRedemptions,
    referralActivity,
    enrollmentsTotal,
    enrollmentsToday,
    stampsAgg,
    stampsAggToday,
    rewardsTotal,
    rewardsToday,
    referralsTotal,
    referralsToday,
  ] = await Promise.all([
    prisma.businessCustomerMembership.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        uuid: true,
        createdAt: true,
        createdBranch: { select: { name: true } },
        firstName: true,
        lastName: true,
      },
    }),
    prisma.stampTransaction.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        quantity: true,
        branch: { select: { name: true } },
        customerProgramMembership: {
          select: {
            loyaltyProgram: { select: { name: true } },
            businessCustomerMembership: {
              select: { uuid: true, firstName: true, lastName: true },
            },
          },
        },
      },
    }),
    prisma.rewardRedemption.findMany({
      where: { businessId },
      orderBy: { redeemedAt: "desc" },
      take: 20,
      select: {
        uuid: true,
        redeemedAt: true,
        rewardName: true,
        branch: { select: { name: true } },
        customerProgramMembership: {
          select: {
            loyaltyProgram: { select: { name: true } },
            businessCustomerMembership: {
              select: { uuid: true, firstName: true, lastName: true },
            },
          },
        },
      },
    }),
    prisma.referral.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        uuid: true,
        status: true,
        referralCode: true,
        createdAt: true,
        referrerMembership: { select: { uuid: true, firstName: true, lastName: true } },
      },
    }),
    prisma.businessCustomerMembership.count({ where: { businessId } }),
    prisma.businessCustomerMembership.count({ where: { businessId, createdAt: { gte: startOfToday } } }),
    prisma.stampTransaction.aggregate({ where: { businessId }, _sum: { quantity: true } }),
    prisma.stampTransaction.aggregate({ where: { businessId, createdAt: { gte: startOfToday } }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { businessId } }),
    prisma.rewardRedemption.count({ where: { businessId, redeemedAt: { gte: startOfToday } } }),
    prisma.referral.count({ where: { businessId } }),
    prisma.referral.count({ where: { businessId, createdAt: { gte: startOfToday } } }),
  ]);

  const metrics: Array<{ category: ActivityCategory; label: string; icon: LucideIcon; total: number; today: number }> = [
    { category: "enrollments", label: "Enrollments", icon: Users, total: enrollmentsTotal, today: enrollmentsToday },
    { category: "stamps", label: "Stamps issued", icon: TicketCheck, total: stampsAgg._sum.quantity ?? 0, today: stampsAggToday._sum.quantity ?? 0 },
    { category: "rewards", label: "Rewards redeemed", icon: Gift, total: rewardsTotal, today: rewardsToday },
    { category: "referrals", label: "Referrals", icon: Share2, total: referralsTotal, today: referralsToday },
  ];

  const timeline: ActivityItem[] = [
    ...customerEnrollments.map((membership) => ({
      category: "enrollments" as const,
      title: `${getCustomerName(membership)} enrolled`,
      meta: membership.createdBranch?.name ?? "No branch",
      createdAt: membership.createdAt,
      icon: UserPlus,
      href: `/dashboard/customers/${membership.uuid}`,
    })),
    ...stampIssuance.map((stamp) => ({
      category: "stamps" as const,
      title: `${stamp.quantity} stamp${stamp.quantity === 1 ? "" : "s"} issued to ${getCustomerName(stamp.customerProgramMembership.businessCustomerMembership)}`,
      meta: `${stamp.customerProgramMembership.loyaltyProgram.name} · ${stamp.branch?.name ?? "No branch"}`,
      createdAt: stamp.createdAt,
      icon: TicketCheck,
      href: `/dashboard/activity/${stamp.id}`,
    })),
    ...rewardRedemptions.map((redemption) => ({
      category: "rewards" as const,
      title: `${getCustomerName(redemption.customerProgramMembership.businessCustomerMembership)} redeemed ${redemption.rewardName}`,
      meta: `${redemption.customerProgramMembership.loyaltyProgram.name} · ${redemption.branch?.name ?? "No branch"}`,
      createdAt: redemption.redeemedAt,
      icon: Gift,
      href: `/dashboard/customers/${redemption.customerProgramMembership.businessCustomerMembership.uuid}`,
    })),
    ...referralActivity.map((referral) => ({
      category: "referrals" as const,
      title: `${getCustomerName(referral.referrerMembership)} referral ${friendlyLabel(referral.status)}`,
      meta: referral.referralCode,
      createdAt: referral.createdAt,
      icon: Share2,
      href: `/dashboard/referrals/${referral.uuid}`,
    })),
  ]
    .filter((item) => (selectedType ? item.category === selectedType : true))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 40);

  const groups = groupByDay(timeline);
  const activeFilterLabel = activityFilters.find((filter) => filter.value === (selectedType ?? "all"))?.label ?? "All activity";

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Activity" hideWelcomeMessage>
      <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-[#171A21]">Recent business activity</h2>
            <p className="mt-0.5 text-[13px] text-[#7A8091]">Enrollments, stamps, reward redemptions, and referrals in one operational timeline.</p>
          </div>
          <Link href="/dashboard" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition business-hover">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.category}
              href={`/dashboard/activity?type=${metric.category}`}
              label={metric.label}
              value={metric.total.toLocaleString()}
              helper={`+${metric.today.toLocaleString()} today`}
              icon={<metric.icon className="h-5 w-5 business-text" aria-hidden />}
            />
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {activityFilters.map((filter) => {
            const active = (selectedType ?? "all") === filter.value;
            const FilterIcon = filter.icon;
            return (
              <Link
                key={filter.value}
                href={filter.value === "all" ? "/dashboard/activity" : `/dashboard/activity?type=${filter.value}`}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                  active ? "business-button text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280] business-hover"
                }`}
              >
                <FilterIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {filter.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 grid gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{group.label}</p>
              <div className="grid">
                {group.items.map((item, index) => (
                  <ActivityRow key={`${item.category}-${item.createdAt.toISOString()}-${index}`} item={item} isLast={index === group.items.length - 1} />
                ))}
              </div>
            </div>
          ))}
          {timeline.length === 0 ? (
            <EmptyState
              title={selectedType ? `No ${activeFilterLabel.toLowerCase()} yet.` : "No activity yet."}
              description="Activity will appear here after customers enroll, earn stamps, redeem rewards, or use referrals."
            />
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const Icon = item.icon;
  const card = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 transition business-hover">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#111827]">{item.title}</p>
        <p className="mt-0.5 truncate text-xs text-[#9CA3AF]">{item.meta}</p>
      </div>
      <p className="shrink-0 text-xs text-[#9CA3AF]">{formatDateTime(item.createdAt)}</p>
    </div>
  );
  return (
    <div className="flex gap-3">
      <div className="relative flex w-7 shrink-0 justify-center">
        <span className={`z-10 flex h-7 w-7 items-center justify-center rounded-full ${toneDotClass[item.category]}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {!isLast ? <span className="absolute left-1/2 top-7 -bottom-1 w-0.5 -translate-x-1/2 bg-[#EEF1F4]" /> : null}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-4"}`}>
        {item.href ? <Link href={item.href} className="block">{card}</Link> : card}
      </div>
    </div>
  );
}

function getCustomerName(customer: { firstName: string; lastName?: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

function friendlyLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupByDay(items: ActivityItem[]) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  const groups = [
    { label: "Today", items: [] as ActivityItem[] },
    { label: "Yesterday", items: [] as ActivityItem[] },
    { label: "Last 7 days", items: [] as ActivityItem[] },
    { label: "Older", items: [] as ActivityItem[] },
  ];

  for (const item of items) {
    const date = startOfDay(item.createdAt);
    if (date.getTime() === today.getTime()) groups[0].items.push(item);
    else if (date.getTime() === yesterday.getTime()) groups[1].items.push(item);
    else if (date >= last7) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
