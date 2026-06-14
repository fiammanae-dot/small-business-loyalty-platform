import Link from "next/link";
import { Bell, Gift, QrCode, TicketCheck, Users } from "lucide-react";
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

  const [customers, stamps, rewards, alerts, todayCustomers, todayStamps, todayRewards, todayAlerts, recentScans] = await Promise.all([
    prisma.businessCustomerMembership.count({ where: { businessId: user.businessId ?? -1 } }),
    prisma.stampTransaction.aggregate({ where: { branchId: user.branchId ?? -1 }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { branchId: user.branchId ?? -1 } }),
    prisma.activityAlert.count({ where: { branchId: user.branchId ?? -1, status: "OPEN" } }),
    prisma.scanEvent.count({ where: { branchId: user.branchId ?? -1, createdAt: { gte: todayStart }, result: "VALID" } }),
    prisma.stampTransaction.aggregate({ where: { branchId: user.branchId ?? -1, createdAt: { gte: todayStart } }, _sum: { quantity: true } }),
    prisma.rewardRedemption.count({ where: { branchId: user.branchId ?? -1, redeemedAt: { gte: todayStart } } }),
    prisma.activityAlert.count({ where: { branchId: user.branchId ?? -1, createdAt: { gte: todayStart }, status: "OPEN" } }),
    prisma.scanEvent.findMany({
      where: { branchId: user.branchId ?? -1 },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Branch manager dashboard">
      <section className="grid gap-4 md:grid-cols-3">
        <Info label="Branch name" value={branch?.name ?? "Unassigned"} />
        <Info label="Business name" value={branch?.business.name ?? "Unassigned"} />
        <Info label="Role" value="Branch Manager" />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#F97316]">Branch Performance</p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric icon={Users} label="Customers" value={customers.toString()} />
          <Metric icon={TicketCheck} label="Stamps" value={(stamps._sum.quantity ?? 0).toString()} />
          <Metric icon={Gift} label="Rewards" value={rewards.toString()} />
          <Metric icon={Bell} label="Alerts" value={alerts.toString()} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Branch Scan Activity</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Today&apos;s scan workflow</h2>
          </div>
          <Link href="/branch/scanner" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#F97316] px-4 py-3 text-sm font-semibold text-white">
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Open Scanner
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric icon={Users} label="Today's Customers" value={todayCustomers.toString()} />
          <Metric icon={TicketCheck} label="Today's Stamps" value={(todayStamps._sum.quantity ?? 0).toString()} />
          <Metric icon={Gift} label="Today's Rewards Redeemed" value={todayRewards.toString()} />
          <Metric icon={Bell} label="Today's Alerts" value={todayAlerts.toString()} />
        </div>
        <div className="mt-5 grid gap-3">
          {recentScans.map((scan) => (
            <div key={scan.id} className="rounded-md border border-[#E5E7EB] p-3 text-sm">
              <p className="font-semibold text-[#111827]">{scan.result.replaceAll("_", " ")}</p>
              <p className="mt-1 text-[#6B7280]">{formatDateTime(scan.createdAt)}</p>
            </div>
          ))}
          {recentScans.length === 0 ? <p className="text-sm text-[#6B7280]">No scan activity yet.</p> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Action href="/branch/customers" icon={Users} title="Business customers" description="Search and open customers across this business." />
        <Action href="/branch/programs" icon={Gift} title="Programs" description="View programs and enroll business customers." />
        <Action href="/branch/scanner" icon={QrCode} title="Scanner" description="Validate customer program QR codes." primary />
      </section>
    </DashboardShell>
  );
}

function Action({ href, icon: Icon, title, description, primary = false }: { href: string; icon: LucideIcon; title: string; description: string; primary?: boolean }) {
  return (
    <Link href={href} className={`rounded-md border bg-white p-5 transition hover:border-[#F97316] hover:shadow-sm ${primary ? "border-[#F97316]" : "border-[#E5E7EB]"}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-[#111827]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{description}</p>
    </Link>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <Icon className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
      <p className="mt-3 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#111827]">{value}</p>
    </div>
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
