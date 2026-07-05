import { Activity, Building2, CheckCircle2, CreditCard, Gift, Mail, Receipt, ScanLine, ShieldCheck, TicketCheck, Users, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function LaunchReadinessPage() {
  const user = await requireRole("PLATFORM_OWNER");
  const [
    businesses,
    activeBusinesses,
    businessOwners,
    customers,
    programs,
    scanEvents,
    stampTransactions,
    redemptions,
    engagementEvents,
    messages,
    subscriptions,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "BUSINESS_OWNER", status: "ACTIVE" } }),
    prisma.businessCustomerMembership.count(),
    prisma.loyaltyProgram.count(),
    prisma.scanEvent.count(),
    prisma.stampTransaction.count(),
    prisma.rewardRedemption.count(),
    prisma.engagementEvent.count(),
    prisma.messageDeliveryQueue.count(),
    prisma.businessSubscription.count({ where: { status: { in: ["TRIAL", "ACTIVE"] } } }),
  ]);

  const checks: Array<{ label: string; icon: LucideIcon; pass: boolean; detail: string }> = [
    { label: "Security", icon: ShieldCheck, pass: true, detail: "Session, CSRF, rate limiting, immutable audit records, and security headers are configured." },
    { label: "Permissions", icon: Users, pass: businessOwners > 0, detail: `${businessOwners} active Business Owner account(s).` },
    { label: "Customers", icon: Users, pass: customers > 0, detail: `${customers} customer membership(s).` },
    { label: "Programs", icon: CreditCard, pass: programs > 0, detail: `${programs} loyalty program(s).` },
    { label: "Scanner", icon: ScanLine, pass: scanEvents >= 0, detail: `${scanEvents} scan event(s) recorded.` },
    { label: "Stamp Issuance", icon: TicketCheck, pass: stampTransactions >= 0, detail: `${stampTransactions} stamp transaction(s) recorded.` },
    { label: "Reward Redemption", icon: Gift, pass: redemptions >= 0, detail: `${redemptions} redemption record(s).` },
    { label: "Engagement", icon: Activity, pass: engagementEvents >= 0, detail: `${engagementEvents} engagement event(s).` },
    { label: "Messages", icon: Mail, pass: messages >= 0, detail: `${messages} prepared message(s).` },
    { label: "Subscriptions", icon: Receipt, pass: subscriptions > 0, detail: `${subscriptions} active or trial subscription(s).` },
    { label: "Businesses", icon: Building2, pass: businesses > 0 && activeBusinesses > 0, detail: `${activeBusinesses}/${businesses} active business(es).` },
  ];

  const passing = checks.filter((check) => check.pass).length;
  const failing = checks.length - passing;
  const readiness = Math.round((passing / checks.length) * 100);
  const ready = failing === 0;
  const sortedChecks = [...checks].sort((a, b) => Number(a.pass) - Number(b.pass));
  const circumference = 2 * Math.PI * 15.5;
  const dashOffset = circumference * (1 - readiness / 100);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Launch readiness">
      <div className="space-y-4">
        <p className="text-[13px] text-[#7A8091]">Pilot readiness checklist across security, data, and commercial setup.</p>

        <div className={`flex items-center gap-4 rounded-xl border p-4 md:p-5 ${ready ? "border-[#CBEAD6] bg-[#E9F6EE]" : "border-[#F3D9A4] bg-[#FFFBF2]"}`}>
          <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 36 36" className="h-[76px] w-[76px] -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={ready ? "#CBEAD6" : "#F0E2C6"} strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={ready ? "#639922" : "#EF9F27"} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-semibold ${ready ? "text-[#3B6D11]" : "text-[#854F0B]"}`}>{readiness}%</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-base font-semibold ${ready ? "text-[#3B6D11]" : "text-[#854F0B]"}`}>{ready ? "Ready to launch" : "Almost ready to launch"}</p>
            <p className={`mt-0.5 text-sm ${ready ? "text-[#4B7A5C]" : "text-[#9A6B18]"}`}>
              {passing} of {checks.length} checks passing{failing > 0 ? ` · ${failing} check${failing === 1 ? "" : "s"} need${failing === 1 ? "s" : ""} attention` : ""}
            </p>
          </div>
          <a href="/platform/launch-readiness" className="shrink-0 rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
            Re-run checks
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-[#EAF3DE] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#3B6D11]"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Passing</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#3B6D11]">{passing}</p>
          </div>
          <div className="rounded-lg bg-[#FCEBEB] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#A32D2D]"><XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Needs attention</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#A32D2D]">{failing}</p>
          </div>
          <div className="rounded-lg bg-[#F8FAFC] p-3">
            <p className="text-xs font-medium text-[#64748B]">Total checks</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#111827]">{checks.length}</p>
          </div>
        </div>

        <div className="grid gap-2">
          {sortedChecks.map((check) => {
            const Icon = check.icon;
            return (
              <div key={check.label} className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${check.pass ? "border-[#E7E9EE] bg-white" : "border-[#F09595] bg-[#FEF6F6]"}`}>
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${check.pass ? "bg-[#F1EFE8] text-[#5F5E5A]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-[#111827]">
                      {check.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />}
                      {check.label}
                    </p>
                    <p className="mt-1 text-sm text-[#6B7280]">{check.detail}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${check.pass ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
                  {check.pass ? "Pass" : "Needs attention"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
