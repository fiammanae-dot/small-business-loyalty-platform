import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { CardShareActions } from "@/components/CardShareActions";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, EmptyState, MetricCard } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { getCardUrl, getShortCardToken } from "@/lib/customer-cards";
import { customerSourceLabels, getBusinessCustomerOrRedirect } from "@/lib/customers";
import { formatDate } from "@/lib/format";
import { formatUaePhoneDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { getScanQrDataUrl, getScanUrl } from "@/lib/scan";
import { requireRole } from "@/lib/session";

export default async function BranchCustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await requireRole("BRANCH_MANAGER");
  const { id } = await params;
  const qs = await searchParams;

  if (!user.businessId || !user.branchId) {
    return (
      <DashboardShell user={user} eyebrow="Branch Manager" title="Customer profile" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Branch assignment is required.</p>
      </DashboardShell>
    );
  }

  const membership = await getBusinessCustomerOrRedirect(id, user.businessId, user.branchId);
  const customer = membership.globalCustomer;
  const cardUrl = await getCardUrl(membership.cardToken);
  const programCards = await Promise.all(
    membership.programMemberships.map(async (programMembership) => ({
      programMembership,
      scanUrl: await getScanUrl(programMembership.scanToken),
      qrCode: await getScanQrDataUrl(programMembership.scanToken),
    })),
  );
  const programMembershipIds = membership.programMemberships.map((programMembership) => programMembership.id);
  const rewardRedemptions = await prisma.rewardRedemption.findMany({
    where: {
      businessId: user.businessId,
      branchId: user.branchId,
      customerProgramMembershipId: { in: programMembershipIds.length ? programMembershipIds : [-1] },
    },
    orderBy: { redeemedAt: "desc" },
    include: {
      branch: true,
      redeemedByUser: true,
      loyaltyProgram: true,
    },
  });
  const primaryProgram = membership.programMemberships.find((programMembership) => programMembership.status === "ACTIVE") ?? membership.programMemberships[0] ?? null;
  const primaryProgress = primaryProgram ? progressValue(primaryProgram.earnedStamps, primaryProgram.bonusStamps) : 0;
  const rewardReady = membership.programMemberships.some(
    (programMembership) => progressValue(programMembership.earnedStamps, programMembership.bonusStamps) >= programMembership.loyaltyProgram.requiredStamps,
  );
  const lastVisit = await prisma.stampTransaction.findFirst({
    where: {
      branchId: user.branchId,
      customerProgramMembershipId: { in: programMembershipIds.length ? programMembershipIds : [-1] },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Customer profile" hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.success ? <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">{customer.firstName} {customer.lastName ?? ""}</h2>
            <p className="mt-2 text-sm text-[#6B7280]">{formatUaePhoneDisplay(customer.normalizedPhone)}</p>
            {rewardReady ? (
              <p className="mt-3 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Reward Ready</p>
            ) : null}
          </div>
          <Link href="/branch/customers" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">Back</Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Email" value={customer.email ?? "-"} />
          <Info label="Birthday" value={customer.birthday ? formatDate(customer.birthday) : "-"} />
          <Info label="Marketing consent" value={membership.marketingConsent ? "Yes" : "No"} />
          <Info label="Current tier" value={membership.currentTier} />
          <Info label="Current progress" value={primaryProgram ? `${primaryProgress} / ${primaryProgram.loyaltyProgram.requiredStamps}` : "-"} />
          <Info label="Last branch visit" value={lastVisit ? formatDate(lastVisit.createdAt) : "-"} />
          <Info label="Rewards ready" value={rewardReady ? "Yes" : "No"} />
          <Info label="Redeemed rewards" value={rewardRedemptions.length.toString()} />
          <Info label="Status" value={<StatusBadge status={membership.status} />} />
          <Info label="Source" value={customerSourceLabels[membership.source]} />
          <Info label="Joined date" value={formatDate(membership.joinedAt)} />
          <Info label="Card issued branch" value={membership.createdBranch?.name ?? "-"} />
          <Info label="Card issued by" value={membership.createdByUser?.name ?? "-"} />
          <Info label="Card issued date" value={formatDate(membership.joinedAt)} />
          <Info label="Notes" value={membership.notes ?? "-"} wide />
        </div>
      </section>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold business-text">Customer card</p>
            <h2 className="mt-2 text-lg font-semibold text-[#111827]">Public member card</h2>
            <p className="mt-2 break-all text-sm text-[#6B7280]">{cardUrl}</p>
            <p className="mt-2 text-sm text-[#6B7280]">Card number: {getShortCardToken(membership.cardToken)}</p>
          </div>
          <a href={cardUrl} target="_blank" rel="noreferrer" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
            Open public card
          </a>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Info label="Card status" value={membership.cardStatus.toLowerCase()} />
          <Info label="Created" value={formatDate(membership.cardCreatedAt)} />
          <Info label="Last viewed" value={membership.cardLastViewedAt ? formatDate(membership.cardLastViewedAt) : "-"} />
        </div>
        <div className="mt-5">
          <CardShareActions
            cardUrl={cardUrl}
            businessName={membership.business.name}
            customerName={`${customer.firstName} ${customer.lastName ?? ""}`.trim()}
            recipientPhone={customer.normalizedPhone}
            auditMembershipUuid={membership.uuid}
            showWallet={false}
          />
        </div>
      </section>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold business-text">Loyalty programs</p>
            <h2 className="mt-2 text-lg font-semibold text-[#111827]">Customer progress</h2>
          </div>
          <Link href="/branch/programs" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
            View programs
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {programCards.map(({ programMembership, scanUrl, qrCode }) => (
            <div key={programMembership.uuid} className="rounded-md border border-[#E5E7EB] p-4">
              <h3 className="text-base font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                Progress: {progressValue(programMembership.earnedStamps, programMembership.bonusStamps)} / {programMembership.loyaltyProgram.requiredStamps}
              </p>
              <p className="mt-2 text-sm text-[#6B7280]">
                Status: {programCustomerStatusLabel({
                  status: programMembership.status,
                  earnedStamps: programMembership.earnedStamps,
                  bonusStamps: programMembership.bonusStamps,
                  requiredStamps: programMembership.loyaltyProgram.requiredStamps,
                })}
              </p>
              <p className="mt-2 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
              <div className="mt-4 rounded-md border border-[#E5E7EB] bg-white p-3">
                <p className="break-all text-xs text-[#6B7280]">{scanUrl}</p>
                <Image src={qrCode} alt={`${programMembership.loyaltyProgram.name} scan QR`} width={160} height={160} unoptimized className="mt-4 rounded-md border border-[#E5E7EB]" />
                <a href={scanUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
                  Open scan URL
                </a>
              </div>
            </div>
          ))}
        </div>
        {membership.programMemberships.length === 0 ? <EmptyState title="No program enrollments yet." className="mt-4 p-4 md:p-4" /> : null}
      </section>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Redemption History</h2>
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Reward", "Program", "Date", "Branch", "Redeemed By"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rewardRedemptions.map((redemption) => (
                <tr key={redemption.id}>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{redemption.rewardName}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{redemption.loyaltyProgram.name}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(redemption.redeemedAt)}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{redemption.branch?.name ?? "-"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{redemption.redeemedByUser.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">
          {rewardRedemptions.map((redemption) => (
            <Card key={redemption.id}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-[#111827]">{redemption.rewardName}</h3>
                    <p className="mt-1 break-words text-sm text-[#6B7280]">{redemption.loyaltyProgram.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Redeemed</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MobileInfo label="Date" value={formatDate(redemption.redeemedAt)} />
                  <MobileInfo label="Branch" value={redemption.branch?.name ?? "-"} />
                  <MobileInfo label="Redeemed by" value={redemption.redeemedByUser.name} />
                  <MobileInfo label="Program" value={redemption.loyaltyProgram.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {rewardRedemptions.length === 0 ? <EmptyState title="No reward redemptions yet." className="my-4" /> : null}
      </section>
    </DashboardShell>
  );
}

function Info({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return <MetricCard label={label} value={value} className={wide ? "h-full md:col-span-3" : "h-full"} />;
}

function MobileInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
