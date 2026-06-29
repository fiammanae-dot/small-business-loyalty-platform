import Link from "next/link";
import { CardShareActions } from "@/components/CardShareActions";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getCardUrl } from "@/lib/customer-cards";
import { customerSourceLabels } from "@/lib/customers";
import { formatDate } from "@/lib/format";
import { formatUaePhoneDisplay, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { requireRole } from "@/lib/session";

export default async function BranchCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; success?: string }>;
}) {
  const user = await requireRole("BRANCH_MANAGER");
  const params = await searchParams;
  const query = params.q?.trim();
  const normalizedQueryPhone = query ? normalizePhone(query) : null;

  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Business customers" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }
  const branchId = user.branchId;

  const customers = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId: user.businessId,
      createdBranchId: branchId,
      ...(query
        ? {
            OR: [
              { globalCustomer: { firstName: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { lastName: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { phone: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { normalizedPhone: { contains: query, mode: "insensitive" } } },
              ...(normalizedQueryPhone ? [{ globalCustomer: { normalizedPhone: normalizedQueryPhone } }] : []),
              { globalCustomer: { email: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      globalCustomer: true,
      createdBranch: true,
      business: true,
      programMemberships: {
        include: {
          loyaltyProgram: true,
          stampTransactions: {
            where: { branchId },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          rewardRedemptions: {
            where: { branchId },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  const customerRows = await Promise.all(
    customers.map(async (membership) => {
      const activePrograms = membership.programMemberships.filter((programMembership) => programMembership.status === "ACTIVE");
      const primaryProgram = activePrograms[0] ?? membership.programMemberships[0] ?? null;
      const primaryProgress = primaryProgram ? progressValue(primaryProgram.earnedStamps, primaryProgram.bonusStamps) : 0;
      const rewardReady = membership.programMemberships.some(
        (programMembership) => programMembership.status === "ACTIVE" && progressValue(programMembership.earnedStamps, programMembership.bonusStamps) >= programMembership.loyaltyProgram.requiredStamps,
      );
      const lastVisit = membership.programMemberships
        .map((programMembership) => programMembership.stampTransactions[0]?.createdAt)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      const redeemedRewards = membership.programMemberships.reduce((sum, programMembership) => sum + programMembership.rewardRedemptions.length, 0);

      return {
        ...membership,
        cardUrl: await getCardUrl(membership.cardToken),
        customerName: `${membership.globalCustomer.firstName} ${membership.globalCustomer.lastName ?? ""}`.trim(),
        primaryProgram,
        primaryProgress,
        rewardReady,
        lastVisit,
        redeemedRewards,
      };
    }),
  );

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Business customers" hideWelcomeMessage>
      <SectionCard>
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-[#6B7280]">Search and open customers assigned to this branch. Business-wide data remains protected.</p>
          </div>
          <Link href="/branch/customers/new" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
            Enroll customer
          </Link>
        </div>
        <form className="mt-5 flex gap-3">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search name, phone, email" className="h-10 flex-1 rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
          <button type="submit" className="rounded-md border business-border px-4 text-sm font-semibold business-text">Search</button>
        </form>
        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Customer", "Tier", "Progress", "Last visit", "Rewards", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customerRows.map((membership) => (
                <tr key={membership.id}>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold">{membership.globalCustomer.firstName} {membership.globalCustomer.lastName ?? ""}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.currentTier}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">
                    {membership.primaryProgram ? (
                      <div className="min-w-40">
                        <p className="font-semibold text-[#111827]">
                          {membership.primaryProgress} / {membership.primaryProgram.loyaltyProgram.requiredStamps}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{membership.primaryProgram.loyaltyProgram.name}</p>
                        {membership.rewardReady ? <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Reward ready</span> : null}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.lastVisit ? formatDate(membership.lastVisit) : "-"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.redeemedRewards}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge status={membership.status} /></td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4">
                    <div className="flex flex-col gap-3">
                      <Link href={`/branch/customers/${membership.uuid}`} className="font-semibold business-text">View</Link>
                      <CardShareActions
                        cardUrl={membership.cardUrl}
                        businessName={membership.business.name}
                        customerName={membership.customerName}
                        recipientPhone={membership.globalCustomer.normalizedPhone}
                        auditMembershipUuid={membership.uuid}
                        showCopy={false}
                        showWallet={false}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-3 md:hidden">
          {customerRows.map((membership) => (
            <Card key={membership.id}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-[#111827]">{membership.customerName}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">{formatUaePhoneDisplay(membership.globalCustomer.normalizedPhone)}</p>
                    {membership.globalCustomer.email ? <p className="mt-1 break-words text-sm text-[#6B7280]">{membership.globalCustomer.email}</p> : null}
                  </div>
                  <StatusBadge status={membership.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MobileInfo label="Joined" value={formatDate(membership.joinedAt)} />
                  <MobileInfo label="Tier" value={membership.currentTier} />
                  <MobileInfo label="Progress" value={membership.primaryProgram ? `${membership.primaryProgress} / ${membership.primaryProgram.loyaltyProgram.requiredStamps}` : "-"} />
                  <MobileInfo label="Last visit" value={membership.lastVisit ? formatDate(membership.lastVisit) : "-"} />
                  <MobileInfo label="Rewards" value={membership.rewardReady ? "Reward ready" : `${membership.redeemedRewards} redeemed`} />
                  <MobileInfo label="Source" value={customerSourceLabels[membership.source]} />
                </div>
                <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-4">
                  <Link href={`/branch/customers/${membership.uuid}`} className="inline-flex min-h-11 items-center justify-center rounded-md business-button px-4 text-sm font-semibold text-white">
                    View customer
                  </Link>
                  <CardShareActions
                    cardUrl={membership.cardUrl}
                    businessName={membership.business.name}
                    customerName={membership.customerName}
                    recipientPhone={membership.globalCustomer.normalizedPhone}
                    auditMembershipUuid={membership.uuid}
                    showCopy={false}
                    showWallet={false}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {customers.length === 0 ? <EmptyState title="No customers found." className="my-4" /> : null}
      </SectionCard>
    </DashboardShell>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}

function MobileInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}




