import Link from "next/link";
import { Bell, Gift, Plus, QrCode, Search, TicketCheck, TrendingUp, UserCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function BranchDashboard() {
  const user = await requireRole("BRANCH_MANAGER");
  const branch = user.branchId
    ? await prisma.branch.findFirst({
        where: { id: user.branchId, businessId: user.businessId ?? undefined },
        include: { business: true },
      })
    : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const businessId = user.businessId ?? -1;
  const branchId = user.branchId ?? -1;

  const [
    activeCustomers,
    newCustomersToday,
    alerts,
    todayCustomers,
    todayStamps,
    todayRewards,
    todayAlerts,
    recentScans,
    recentCustomers,
    recentStamps,
    recentRewards,
    recentProgramEnrollments,
    closeToRewardCandidates,
    staffUsers,
    todayStaffStamps,
    todayStaffRewards,
    weekCustomers,
    weekStamps,
    weekRewards,
    monthCustomers,
    monthStamps,
    monthRewards,
  ] = await Promise.all([
    prisma.businessCustomerMembership.count({ where: { businessId, createdBranchId: branchId, status: "ACTIVE" } }),
    prisma.businessCustomerMembership.count({ where: { businessId, createdBranchId: branchId, joinedAt: { gte: todayStart } } }),
    prisma.activityAlert.count({ where: { branchId, status: "OPEN" } }),
    prisma.scanEvent.count({ where: { branchId, createdAt: { gte: todayStart }, result: "VALID" } }),
    prisma.stampTransaction.aggregate({ where: { branchId, createdAt: { gte: todayStart } }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { branchId, redeemedAt: { gte: todayStart } } }),
    prisma.activityAlert.count({ where: { branchId, createdAt: { gte: todayStart }, status: "OPEN" } }),
    prisma.scanEvent.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        scannedByUser: { select: { id: true, name: true } },
        customerProgramMembership: {
          include: {
            loyaltyProgram: { select: { name: true } },
            businessCustomerMembership: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    }),
    prisma.businessCustomerMembership.findMany({
      where: { businessId, createdBranchId: branchId },
      orderBy: { joinedAt: "desc" },
      take: 4,
      select: { id: true, joinedAt: true, firstName: true, lastName: true },
    }),
    prisma.stampTransaction.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        issuedByUser: { select: { name: true } },
        customerProgramMembership: {
          include: {
            loyaltyProgram: { select: { name: true } },
            businessCustomerMembership: true,
          },
        },
      },
    }),
    prisma.rewardRedemption.findMany({
      where: { branchId },
      orderBy: { redeemedAt: "desc" },
      take: 4,
      include: {
        redeemedByUser: { select: { name: true } },
        loyaltyProgram: { select: { name: true } },
        customerProgramMembership: {
          include: { businessCustomerMembership: true },
        },
      },
    }),
    prisma.customerProgramMembership.findMany({
      where: { businessCustomerMembership: { businessId, createdBranchId: branchId } },
      orderBy: { enrolledAt: "desc" },
      take: 4,
      include: {
        loyaltyProgram: { select: { name: true } },
        businessCustomerMembership: true,
      },
    }),
    prisma.customerProgramMembership.findMany({
      where: { status: "ACTIVE", businessCustomerMembership: { businessId, createdBranchId: branchId, status: "ACTIVE" } },
      include: {
        loyaltyProgram: { select: { name: true, requiredStamps: true, rewardName: true } },
        businessCustomerMembership: true,
      },
      orderBy: { enrolledAt: "desc" },
      take: 30,
    }),
    prisma.user.findMany({
      where: { businessId, branchId, role: "STAFF", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.stampTransaction.findMany({
      where: { branchId, createdAt: { gte: todayStart } },
      select: { issuedByUserId: true, customerProgramMembershipId: true, quantity: true },
    }),
    prisma.rewardRedemption.findMany({
      where: { branchId, redeemedAt: { gte: todayStart } },
      select: { redeemedByUserId: true, customerProgramMembershipId: true },
    }),
    prisma.businessCustomerMembership.count({ where: { businessId, createdBranchId: branchId, joinedAt: { gte: weekStart } } }),
    prisma.stampTransaction.aggregate({ where: { branchId, createdAt: { gte: weekStart } }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { branchId, redeemedAt: { gte: weekStart } } }),
    prisma.businessCustomerMembership.count({ where: { businessId, createdBranchId: branchId, joinedAt: { gte: monthStart } } }),
    prisma.stampTransaction.aggregate({ where: { branchId, createdAt: { gte: monthStart } }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { branchId, redeemedAt: { gte: monthStart } } }),
  ]);

  const closeToReward = closeToRewardCandidates
    .map((membership) => {
      const progress = membership.earnedStamps + membership.bonusStamps;
      const remaining = Math.max(membership.loyaltyProgram.requiredStamps - progress, 0);
      return { membership, progress, remaining };
    })
    .filter((item) => item.remaining > 0 && item.remaining <= 2)
    .slice(0, 6);

  const recentActivity = [
    ...recentCustomers.map((membership) => ({
      key: `customer-${membership.id}`,
      title: "Customer joined",
      description: customerName(membership),
      meta: "New branch customer",
      time: membership.joinedAt,
    })),
    ...recentStamps.map((stamp) => ({
      key: `stamp-${stamp.id}`,
      title: "Stamp added",
      description: `${customerName(stamp.customerProgramMembership.businessCustomerMembership)} - ${stamp.customerProgramMembership.loyaltyProgram.name}`,
      meta: `${stamp.quantity} stamp${stamp.quantity === 1 ? "" : "s"} by ${stamp.issuedByUser.name}`,
      time: stamp.createdAt,
    })),
    ...recentRewards.map((redemption) => ({
      key: `reward-${redemption.id}`,
      title: "Reward redeemed",
      description: `${customerName(redemption.customerProgramMembership.businessCustomerMembership)} - ${redemption.rewardName}`,
      meta: `${redemption.loyaltyProgram.name} by ${redemption.redeemedByUser.name}`,
      time: redemption.redeemedAt,
    })),
    ...recentProgramEnrollments.map((membership) => ({
      key: `enrollment-${membership.id}`,
      title: "Customer enrolled in program",
      description: `${customerName(membership.businessCustomerMembership)} - ${membership.loyaltyProgram.name}`,
      meta: "Program enrollment",
      time: membership.enrolledAt,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 8);

  const staffActivity = staffUsers.map((staff) => {
    const staffStamps = todayStaffStamps.filter((stamp) => stamp.issuedByUserId === staff.id);
    const staffRewards = todayStaffRewards.filter((reward) => reward.redeemedByUserId === staff.id);
    const customersServed = new Set([
      ...staffStamps.map((stamp) => stamp.customerProgramMembershipId),
      ...staffRewards.map((reward) => reward.customerProgramMembershipId),
    ]).size;

    return {
      id: staff.id,
      name: staff.name,
      customersServed,
      stampsIssued: staffStamps.reduce((sum, stamp) => sum + stamp.quantity, 0),
      rewardsRedeemed: staffRewards.length,
    };
  });

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Branch manager dashboard" hideWelcomeMessage>
      <section className="grid gap-4 md:grid-cols-2">
        <Info label="Branch name" value={branch?.name ?? "Unassigned"} />
        <Info label="Business name" value={branch?.business.name ?? "Unassigned"} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Action href="/branch/scanner" icon={QrCode} title="Scanner" description="Validate customer QR codes and manage stamp/reward flow." primary />
        <Action href="/branch/customers" icon={Search} title="Find Customer" description="Search customers by name, phone, email, or card number." />
        <Action href="/branch/customers/new" icon={Plus} title="Add Customer" description="Enroll a customer for this branch without changing program settings." />
        <Action href="/branch/programs" icon={Gift} title="Programs" description="Review active loyalty programs and branch performance." />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold business-primary">Branch Performance</p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <Metric icon={Users} label="Active Customers" value={activeCustomers.toString()} href="/branch/customers" />
          <Metric icon={Users} label="New Customers Today" value={newCustomersToday.toString()} href="/branch/customers" />
          <Metric icon={TicketCheck} label="Stamps Issued Today" value={(todayStamps._sum.quantity ?? 0).toString()} />
          <Metric icon={Gift} label="Rewards Redeemed Today" value={todayRewards.toString()} />
          <Metric icon={Bell} label="Open Alerts" value={alerts.toString()} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md business-bg-soft business-primary">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold business-primary">Branch Performance</p>
            <h2 className="text-xl font-semibold text-[#111827]">Operational periods</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <PerformancePeriod label="Today" customers={newCustomersToday} stamps={todayStamps._sum.quantity ?? 0} rewards={todayRewards} />
          <PerformancePeriod label="This Week" customers={weekCustomers} stamps={weekStamps._sum.quantity ?? 0} rewards={weekRewards} />
          <PerformancePeriod label="This Month" customers={monthCustomers} stamps={monthStamps._sum.quantity ?? 0} rewards={monthRewards} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold business-primary">Branch Activity</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Today&apos;s scan workflow</h2>
          </div>
          <Link href="/branch/scanner" className="inline-flex items-center justify-center gap-2 rounded-md business-button px-4 py-3 text-sm font-semibold text-white">
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Open Scanner
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric icon={Users} label="Customers Served Today" value={todayCustomers.toString()} href="/branch/customers" />
          <Metric icon={TicketCheck} label="Today&apos;s Stamps" value={(todayStamps._sum.quantity ?? 0).toString()} />
          <Metric icon={Gift} label="Today&apos;s Rewards Redeemed" value={todayRewards.toString()} />
          <Metric icon={Bell} label="Today&apos;s Alerts" value={todayAlerts.toString()} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold text-[#111827]">Recent branch activity</h3>
            {recentActivity.map((item) => (
              <BranchActivityItem key={item.key} title={item.title} description={item.description} meta={item.meta} time={item.time} />
            ))}
            {recentActivity.length === 0 ? <EmptyState title="No branch activity yet." className="p-4 md:p-4" /> : null}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold text-[#111827]">Customers close to reward</h3>
            {closeToReward.map(({ membership, progress, remaining }) => (
              <div key={membership.id} className="rounded-md border border-[#E5E7EB] p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[#111827]">{customerName(membership.businessCustomerMembership)}</p>
                    <p className="mt-1 text-[#6B7280]">{membership.loyaltyProgram.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{remaining} left</span>
                </div>
                <p className="mt-3 text-xs text-[#6B7280]">
                  {progress} / {membership.loyaltyProgram.requiredStamps} visits - {membership.loyaltyProgram.rewardName}
                </p>
              </div>
            ))}
            {closeToReward.length === 0 ? <EmptyState title="No customers close to reward." className="p-4 md:p-4" /> : null}
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {recentScans.map((scan) => (
            <ActivityRow key={scan.id} scan={scan} />
          ))}
          {recentScans.length === 0 ? <EmptyState title="No scan activity yet." className="p-4 md:p-4" /> : null}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 business-bg-soft business-primary">
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold business-primary">Supervisor view</p>
            <h2 className="text-xl font-semibold text-[#111827]">Today&apos;s Staff Activity</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staffActivity.map((staff) => (
            <div key={staff.id} className="rounded-md border border-[#E5E7EB] p-4">
              <p className="font-semibold text-[#111827]">{staff.name}</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <StaffStat label="Customers served" value={staff.customersServed.toString()} />
                <StaffStat label="Stamps issued" value={staff.stampsIssued.toString()} />
                <StaffStat label="Rewards redeemed" value={staff.rewardsRedeemed.toString()} />
              </dl>
            </div>
          ))}
          {staffActivity.length === 0 ? <EmptyState title="No active staff assigned to this branch." className="p-4 md:p-4" /> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

type RecentScan = {
  id: number;
  result: string;
  createdAt: Date;
  scannedByUser: { name: string } | null;
  customerProgramMembership: {
    loyaltyProgram: { name: string };
    businessCustomerMembership: {
      firstName: string;
      lastName: string | null;
    };
  } | null;
};

function ActivityRow({ scan }: { scan: RecentScan }) {
  const programMembership = scan.customerProgramMembership;
  const customer = programMembership?.businessCustomerMembership;
  const customerName = customer ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : "Customer unavailable";
  const actionLabel = scan.result === "VALID" ? "QR Validated" : scan.result.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="rounded-md border border-[#E5E7EB] p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-[#111827]">{actionLabel}</p>
          <p className="mt-1 text-[#6B7280]">{customerName}</p>
        </div>
        <p className="text-xs text-[#6B7280]">{formatDateTime(scan.createdAt)}</p>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-2 lg:grid-cols-3">
        <span>Program: {programMembership?.loyaltyProgram.name ?? "-"}</span>
        <span>Staff: {scan.scannedByUser?.name ?? "System"}</span>
        <span>Result: {scan.result.replaceAll("_", " ")}</span>
      </div>
    </div>
  );
}

function StaffStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#FAFAFA] px-3 py-2">
      <dt className="text-[#6B7280]">{label}</dt>
      <dd className="font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

function PerformancePeriod({ label, customers, stamps, rewards }: { label: string; customers: number; stamps: number; rewards: number }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="font-semibold text-[#111827]">{label}</p>
      <dl className="mt-3 grid gap-2 text-sm">
        <StaffStat label="New customers" value={customers.toString()} />
        <StaffStat label="Stamps issued" value={stamps.toString()} />
        <StaffStat label="Rewards redeemed" value={rewards.toString()} />
      </dl>
    </div>
  );
}

function BranchActivityItem({ title, description, meta, time }: { title: string; description: string; meta: string; time: Date }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[#111827]">{title}</p>
          <p className="mt-1 break-words text-[#6B7280]">{description}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">{meta}</p>
        </div>
        <p className="shrink-0 text-xs text-[#6B7280]">{formatDateTime(time)}</p>
      </div>
    </div>
  );
}

function customerName(customer: { firstName: string; lastName: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

function Action({ href, icon: Icon, title, description, primary = false }: { href: string; icon: LucideIcon; title: string; description: string; primary?: boolean }) {
  return (
    <Link href={href} className={`rounded-md border bg-white p-5 transition business-hover hover:shadow-sm ${primary ? "business-border" : "border-[#E5E7EB]"}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 business-bg-soft business-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-[#111827]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{description}</p>
    </Link>
  );
}

function Metric({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: string; href?: string }) {
  return <MetricCard href={href} label={label} value={value} icon={<Icon className="h-4 w-4 business-primary" />} className="h-full" />;
}
function Info({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} className="h-full" />;
}
