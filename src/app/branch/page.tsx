import Link from "next/link";
import { Bell, Gift, QrCode, Search, TicketCheck, UserCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
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
  const businessId = user.businessId ?? -1;
  const branchId = user.branchId ?? -1;

  const [
    customers,
    stamps,
    rewards,
    alerts,
    todayCustomers,
    todayStamps,
    todayRewards,
    todayAlerts,
    recentScans,
    staffUsers,
    todayStaffStamps,
    todayStaffRewards,
  ] = await Promise.all([
    prisma.businessCustomerMembership.count({ where: { businessId } }),
    prisma.stampTransaction.aggregate({ where: { branchId }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { branchId } }),
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
              include: { globalCustomer: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
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
  ]);

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
        <Action href="/branch/programs" icon={Gift} title="Programs" description="Review active loyalty programs and branch performance." />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold business-primary">Branch Performance</p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric icon={Users} label="Customers" value={customers.toString()} href="/branch/customers" />
          <Metric icon={TicketCheck} label="Stamps" value={(stamps._sum.quantity ?? 0).toString()} />
          <Metric icon={Gift} label="Rewards" value={rewards.toString()} />
          <Metric icon={Bell} label="Alerts" value={alerts.toString()} />
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
          <Metric icon={Users} label="Today&apos;s Customers" value={todayCustomers.toString()} href="/branch/customers" />
          <Metric icon={TicketCheck} label="Today&apos;s Stamps" value={(todayStamps._sum.quantity ?? 0).toString()} />
          <Metric icon={Gift} label="Today&apos;s Rewards Redeemed" value={todayRewards.toString()} />
          <Metric icon={Bell} label="Today&apos;s Alerts" value={todayAlerts.toString()} />
        </div>
        <div className="mt-5 grid gap-3">
          {recentScans.map((scan) => (
            <ActivityRow key={scan.id} scan={scan} />
          ))}
          {recentScans.length === 0 ? <p className="text-sm text-[#6B7280]">No scan activity yet.</p> : null}
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
          {staffActivity.length === 0 ? <p className="text-sm text-[#6B7280]">No active staff assigned to this branch.</p> : null}
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
      globalCustomer: { firstName: string; lastName: string | null };
    };
  } | null;
};

function ActivityRow({ scan }: { scan: RecentScan }) {
  const programMembership = scan.customerProgramMembership;
  const customer = programMembership?.businessCustomerMembership.globalCustomer;
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
  const content = (
    <div className={`h-full rounded-md border border-[#E5E7EB] p-4 transition ${href ? "cursor-pointer business-hover hover:shadow-sm" : ""}`}>
      <Icon className="h-4 w-4 business-primary" aria-hidden="true" />
      <p className="mt-3 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#111827]">{value}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-md focus:outline-none business-ring">
      {content}
    </Link>
  ) : (
    content
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

