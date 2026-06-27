import Link from "next/link";
import { Gift, History, Share2, TicketCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ActivityItem = {
  type: string;
  title: string;
  meta: string;
  createdAt: Date;
  icon: LucideIcon;
  href?: string;
};

export default async function BusinessActivityPage() {
  const { user } = await getBusinessOwnerContext();

  const [customerEnrollments, stampIssuance, rewardRedemptions, referralActivity] = await Promise.all([
    prisma.businessCustomerMembership.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        uuid: true,
        createdAt: true,
        createdBranch: { select: { name: true } },
        globalCustomer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.stampTransaction.findMany({
      where: { businessId: user.businessId },
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
              select: {
                uuid: true,
                globalCustomer: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.rewardRedemption.findMany({
      where: { businessId: user.businessId },
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
              select: {
                uuid: true,
                globalCustomer: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.referral.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        uuid: true,
        status: true,
        referralCode: true,
        createdAt: true,
        referrerMembership: {
          select: {
            uuid: true,
            globalCustomer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  const timeline: ActivityItem[] = [
    ...customerEnrollments.map((membership) => ({
      type: "Customer enrollment",
      title: getCustomerName(membership.globalCustomer),
      meta: membership.createdBranch?.name ?? "No branch",
      createdAt: membership.createdAt,
      icon: Users,
      href: `/dashboard/customers/${membership.uuid}`,
    })),
    ...stampIssuance.map((stamp) => ({
      type: `${stamp.quantity} stamp${stamp.quantity === 1 ? "" : "s"} issued`,
      title: getCustomerName(stamp.customerProgramMembership.businessCustomerMembership.globalCustomer),
      meta: `${stamp.customerProgramMembership.loyaltyProgram.name} - ${stamp.branch?.name ?? "No branch"}`,
      createdAt: stamp.createdAt,
      icon: TicketCheck,
      href: `/dashboard/activity/${stamp.id}`,
    })),
    ...rewardRedemptions.map((redemption) => ({
      type: "Reward redemption",
      title: getCustomerName(redemption.customerProgramMembership.businessCustomerMembership.globalCustomer),
      meta: `${redemption.rewardName} - ${redemption.branch?.name ?? "No branch"}`,
      createdAt: redemption.redeemedAt,
      icon: Gift,
      href: `/dashboard/customers/${redemption.customerProgramMembership.businessCustomerMembership.uuid}`,
    })),
    ...referralActivity.map((referral) => ({
      type: "Referral activity",
      title: getCustomerName(referral.referrerMembership.globalCustomer),
      meta: `${referral.referralCode} - ${friendlyLabel(referral.status)}`,
      createdAt: referral.createdAt,
      icon: Share2,
      href: `/dashboard/referrals/${referral.uuid}`,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 40);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Activity" hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold business-text">Customer activity timeline</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#111827]">Recent business activity</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Review customer enrollments, stamps, reward redemptions, and referrals in one operational timeline.
            </p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ActivityMetric label="Customer enrollments" value={customerEnrollments.length.toString()} icon={Users} />
          <ActivityMetric label="Stamp issuance" value={stampIssuance.length.toString()} icon={TicketCheck} />
          <ActivityMetric label="Reward redemptions" value={rewardRedemptions.length.toString()} icon={Gift} />
          <ActivityMetric label="Referral activity" value={referralActivity.length.toString()} icon={Share2} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md business-bg-soft business-text">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Timeline</h2>
            <p className="text-sm text-[#6B7280]">Latest customer and loyalty operations.</p>
          </div>
        </div>

        <div className="grid gap-3">
          {timeline.length ? (
            timeline.map((item, index) => <ActivityRow key={`${item.type}-${item.createdAt.toISOString()}-${index}`} item={item} />)
          ) : (
            <EmptyState title="No activity yet." description="Activity will appear here after customers enroll, earn stamps, redeem rewards, or use referrals." />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function ActivityMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return <MetricCard label={label} value={value} icon={<Icon className="h-5 w-5 business-text" />} className="h-full" />;
}
function ActivityRow({ item }: { item: ActivityItem }) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md business-bg-soft business-text">
        <item.icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#111827]">{item.type}</p>
          <p className="text-xs text-[#6B7280]">{formatDateTime(item.createdAt)}</p>
        </div>
        <p className="mt-1 truncate text-sm text-[#111827]">{item.title}</p>
        <p className="mt-1 text-xs text-[#6B7280]">{item.meta}</p>
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="flex gap-3 rounded-md border border-[#E5E7EB] p-3 transition business-hover">
        {content}
      </Link>
    );
  }

  return <div className="flex gap-3 rounded-md border border-[#E5E7EB] p-3">{content}</div>;
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






