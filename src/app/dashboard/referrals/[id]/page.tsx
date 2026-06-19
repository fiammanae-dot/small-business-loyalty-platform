import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gift, History, Share2, Stamp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const referral = await prisma.referral.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      referrerMembership: { include: { globalCustomer: true, programMemberships: { include: { loyaltyProgram: true } } } },
      referredMembership: { include: { globalCustomer: true, programMemberships: { include: { loyaltyProgram: true } } } },
      referredGlobalCustomer: true,
      referredFirstStampBranch: true,
      firstStampTransaction: {
        include: {
          branch: true,
          issuedByUser: true,
          customerProgramMembership: { include: { loyaltyProgram: true } },
        },
      },
      rewards: { include: { loyaltyProgram: true, referrerProgramMembership: true }, orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!referral) notFound();

  const referred = referral.referredMembership?.globalCustomer ?? referral.referredGlobalCustomer;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Referral details">
      <div>
        <Link href="/dashboard/referrals" className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to referrals
        </Link>
      </div>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={referral.status} />
              <span className="rounded-md business-bg-soft px-2 py-1 text-xs font-semibold business-text-strong">{referral.referralCode}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[#111827]">
              {customerName(referral.referrerMembership.globalCustomer)} referred {referred ? customerName(referred) : "a customer"}
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">Created {formatDateTime(referral.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/customers/${referral.referrerMembership.uuid}`} className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
              View referrer
            </Link>
            {referral.referredMembership ? (
              <Link href={`/dashboard/customers/${referral.referredMembership.uuid}`} className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
                View referred customer
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info icon={Share2} label="Source" value={referral.source} />
          <Info icon={History} label="Qualified at" value={referral.qualifiedAt ? formatDateTime(referral.qualifiedAt) : "-"} />
          <Info icon={Stamp} label="First stamp branch" value={referral.referredFirstStampBranch?.name ?? "-"} />
          <Info icon={Gift} label="Rewards" value={referral.rewards.length.toString()} />
        </div>
        {referral.rejectionReason ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{referral.rejectionReason}</p>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <CustomerPanel title="Referrer" membership={referral.referrerMembership} />
        <CustomerPanel title="Referred customer" membership={referral.referredMembership} fallbackCustomer={referral.referredGlobalCustomer} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 business-text" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[#111827]">Reward grants</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {referral.rewards.map((reward) => (
              <div key={reward.id} className="rounded-md border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#111827]">{reward.loyaltyProgram.name}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{reward.bonusStamps} bonus stamp{reward.bonusStamps === 1 ? "" : "s"}</p>
                  </div>
                  <StatusPill status={reward.status} />
                </div>
                <p className="mt-3 text-sm text-[#6B7280]">Granted: {reward.grantedAt ? formatDateTime(reward.grantedAt) : "-"}</p>
              </div>
            ))}
            {referral.rewards.length === 0 ? <p className="text-sm text-[#6B7280]">No referral reward record yet.</p> : null}
          </div>
        </div>

        <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Stamp className="h-5 w-5 business-text" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[#111827]">First stamp qualification</h2>
          </div>
          {referral.firstStampTransaction ? (
            <div className="mt-4 rounded-md border border-[#E5E7EB] p-4">
              <p className="font-semibold text-[#111827]">Transaction #{referral.firstStampTransaction.id}</p>
              <div className="mt-3 grid gap-2 text-sm text-[#6B7280] md:grid-cols-2">
                <p>Program: {referral.firstStampTransaction.customerProgramMembership.loyaltyProgram.name}</p>
                <p>Quantity: {referral.firstStampTransaction.quantity}</p>
                <p>Branch: {referral.firstStampTransaction.branch?.name ?? "-"}</p>
                <p>Issued by: {referral.firstStampTransaction.issuedByUser.name}</p>
                <p>Date: {formatDateTime(referral.firstStampTransaction.createdAt)}</p>
                <p>Reason: {referral.firstStampTransaction.reason ?? "-"}</p>
              </div>
              <Link href={`/dashboard/activity/${referral.firstStampTransaction.id}`} className="mt-4 inline-flex rounded-md border business-border px-4 py-2 text-sm font-semibold business-text">
                View stamp activity
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#6B7280]">Referral has not qualified through a first stamp yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 business-text" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#111827]">Referral event history</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {referral.events.map((event) => (
            <div key={event.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{friendlyStatus(event.eventType)}</p>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-[#FAFAFA] p-3 text-xs text-[#374151]">{JSON.stringify(event.metadata, null, 2)}</pre>
                </div>
                <p className="shrink-0 text-sm text-[#6B7280]">{formatDateTime(event.createdAt)}</p>
              </div>
            </div>
          ))}
          {referral.events.length === 0 ? <p className="text-sm text-[#6B7280]">No referral events recorded.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function CustomerPanel({
  title,
  membership,
  fallbackCustomer,
}: {
  title: string;
  membership: CustomerMembership | null;
  fallbackCustomer?: { firstName: string; lastName: string | null; phone: string } | null;
}) {
  const customer = membership?.globalCustomer ?? fallbackCustomer;
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 business-text" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      </div>
      {customer ? (
        <div className="mt-4 grid gap-3">
          <Info label="Customer" value={customerName(customer)} />
          <Info label="Phone" value={customer.phone} />
          <Info label="Membership" value={membership ? "Linked" : "Not linked"} />
          {membership ? <Info label="Card status" value={membership.cardStatus} /> : null}
          {membership ? (
            <Link href={`/dashboard/customers/${membership.uuid}`} className="inline-flex w-fit rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
              Open customer profile
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#6B7280]">No customer information available.</p>
      )}
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      {Icon ? <Icon className="h-4 w-4 business-text" aria-hidden="true" /> : null}
      <p className="mt-2 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes =
    status === "QUALIFIED" || status === "GRANTED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED"
        ? "bg-red-50 text-red-700"
        : "bg-orange-50 text-[#C2410C]";
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{friendlyStatus(status)}</span>;
}

function friendlyStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function customerName(customer: { firstName: string; lastName: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

type CustomerMembership = Prisma.BusinessCustomerMembershipGetPayload<{
  include: { globalCustomer: true; programMemberships: { include: { loyaltyProgram: true } } };
}>;
