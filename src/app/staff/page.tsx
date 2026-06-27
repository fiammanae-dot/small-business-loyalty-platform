import Link from "next/link";
import { Gift, QrCode, Search, TicketCheck, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function StaffDashboard() {
  const user = await requireRole("STAFF");
  const branch = user.branchId
    ? await prisma.branch.findFirst({
        where: { id: user.branchId, businessId: user.businessId ?? undefined },
        include: { business: true },
      })
    : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [served, stamps, recentScans] = await Promise.all([
    prisma.stampTransaction.count({ where: { issuedByUserId: user.id, createdAt: { gte: todayStart } } }),
    prisma.stampTransaction.aggregate({ where: { issuedByUserId: user.id, createdAt: { gte: todayStart } }, _sum: { quantity: true } }),
    prisma.scanEvent.findMany({
      where: { scannedByUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Staff dashboard" hideWelcomeMessage>
<section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold business-primary">Today&apos;s Activity</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Service summary</h2>
          </div>
          <Link href="/staff/scanner" className="inline-flex items-center justify-center gap-2 rounded-md business-button px-4 py-3 text-sm font-semibold text-white">
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Quick Scanner
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Metric icon={Users} label="Customers Served Today" value={served.toString()} />
          <Metric icon={TicketCheck} label="Stamps Issued Today" value={(stamps._sum.quantity ?? 0).toString()} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Action href="/staff/scanner" icon={QrCode} title="Scanner" description="Validate customer program QR codes." primary />
        <Action href="/staff/customers" icon={Search} title="Find customer" description="Search customers by name, phone, or card number." />
        <Action href="/staff/customers/new" icon={UserPlus} title="Enroll customer" description="Create a customer membership for this branch." />
        <Action href="/staff/programs" icon={Gift} title="Programs" description="View available loyalty programs." />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Info label="Staff name" value={user.name} />
        <Info label="Business name" value={branch?.business.name ?? "Unassigned"} />
        <Info label="Branch name" value={branch?.name ?? "Unassigned"} />
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold business-primary">Recent Scan Activity</p>
        <div className="mt-4 grid gap-3">
          {recentScans.map((scan) => (
            <div key={scan.id} className="rounded-md border border-[#E5E7EB] p-3 text-sm">
              <p className="font-semibold text-[#111827]">{scan.result.replaceAll("_", " ")}</p>
              <p className="mt-1 text-[#6B7280]">{formatDateTime(scan.createdAt)}</p>
            </div>
          ))}
          {recentScans.length === 0 ? <EmptyState title="No scan activity yet today." className="p-4 md:p-4" /> : null}
        </div>
      </section>
    </DashboardShell>
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

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <MetricCard label={label} value={value} icon={<Icon className="h-4 w-4 business-primary" />} className="h-full" />;
}
function Info({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} className="h-full" />;
}
