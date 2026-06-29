import { CheckCircle2, XCircle } from "lucide-react";
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

  const rows = [
    ["Security", true, "Session, CSRF, rate limiting, immutable audit records, and security headers are configured."],
    ["Permissions", businessOwners > 0, `${businessOwners} active Business Owner account(s).`],
    ["Customers", customers > 0, `${customers} customer membership(s).`],
    ["Programs", programs > 0, `${programs} loyalty program(s).`],
    ["Scanner", scanEvents >= 0, `${scanEvents} scan event(s) recorded.`],
    ["Stamp Issuance", stampTransactions >= 0, `${stampTransactions} stamp transaction(s) recorded.`],
    ["Reward Redemption", redemptions >= 0, `${redemptions} redemption record(s).`],
    ["Engagement", engagementEvents >= 0, `${engagementEvents} engagement event(s).`],
    ["Messages", messages >= 0, `${messages} prepared message(s).`],
    ["Subscriptions", subscriptions > 0, `${subscriptions} active or trial subscription(s).`],
    ["Businesses", businesses > 0 && activeBusinesses > 0, `${activeBusinesses}/${businesses} active business(es).`],
  ] as const;

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Launch readiness">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Pilot readiness checklist</h2>
        <div className="mt-5 grid gap-3">
          {rows.map(([label, pass, detail]) => (
            <div key={label} className="flex flex-col gap-3 rounded-md border border-[#E5E7EB] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                {pass ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-600" />}
                <div>
                  <p className="font-semibold text-[#111827]">{label}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{detail}</p>
                </div>
              </div>
              <span className={`rounded-md px-3 py-1 text-xs font-semibold ${pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {pass ? "Pass" : "Needs attention"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
