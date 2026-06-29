import Image from "next/image";
import Link from "next/link";
import type React from "react";
import QRCode from "qrcode";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getCardUrl, getShortCardToken } from "@/lib/customer-cards";
import { formatUaePhoneDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { requireRole } from "@/lib/session";

export default async function StaffCustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("STAFF");
  const { id } = await params;

  if (!user.businessId) {
    return (
      <DashboardShell user={user} eyebrow="Staff" title="Customer profile" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Business assignment is required.</p>
      </DashboardShell>
    );
  }

  const membership = await prisma.businessCustomerMembership.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      globalCustomer: true,
      business: true,
      programMemberships: {
        where: { status: "ACTIVE" },
        include: { loyaltyProgram: true },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!membership) {
    return (
      <DashboardShell user={user} eyebrow="Staff" title="Customer profile" hideWelcomeMessage>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Customer not found in your business.</p>
        <Link href="/staff/customers" className="mt-4 inline-flex rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
          Back to customer search
        </Link>
      </DashboardShell>
    );
  }

  const customer = membership.globalCustomer;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const cardUrl = await getCardUrl(membership.cardToken);
  const cardQrCode = await QRCode.toDataURL(cardUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: { dark: "#111827", light: "#FFFFFF" },
  });

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Customer profile" hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold business-primary">Read-only customer view</p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-[#111827]">{customerName}</h2>
            <p className="mt-2 text-sm text-[#6B7280]">{formatUaePhoneDisplay(customer.normalizedPhone)}</p>
          </div>
          <Link href="/staff/customers" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
            Back
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Customer tier" value={`${membership.currentTier} MEMBER`} />
          <Info label="Card status" value={<StatusBadge status={membership.cardStatus} />} />
          <Info label="Membership status" value={<StatusBadge status={membership.status} />} />
          <Info label="Referral code" value={membership.referralCode ?? "-"} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold business-primary">Active loyalty programs</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Loyalty progress</h2>
          </div>
          <div className="mt-5 grid gap-4">
            {membership.programMemberships.map((programMembership) => {
              const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
              const percent = Math.min(100, Math.round((progress / programMembership.loyaltyProgram.requiredStamps) * 100));
              return (
                <article key={programMembership.uuid} className="rounded-md border border-[#E5E7EB] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
                    </div>
                    <span className="rounded-md bg-[#F3F4F6] px-2 py-1 text-xs font-semibold text-[#374151]">
                      {programCustomerStatusLabel({
                        status: programMembership.status,
                        earnedStamps: programMembership.earnedStamps,
                        bonusStamps: programMembership.bonusStamps,
                        requiredStamps: programMembership.loyaltyProgram.requiredStamps,
                      })}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#111827]">
                      <span>{progress} / {programMembership.loyaltyProgram.requiredStamps} stamps</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full business-secondary-bg-soft">
                      <div className="h-2 rounded-full business-progress" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
            {membership.programMemberships.length === 0 ? <p className="text-sm text-[#6B7280]">No active loyalty programs.</p> : null}
          </div>
        </div>

        <aside className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold business-primary">Loyalty card QR</p>
          <p className="mt-2 break-all text-xs text-[#6B7280]">Card: {getShortCardToken(membership.cardToken)}</p>
          <Image src={cardQrCode} alt={`${customerName} loyalty card QR`} width={220} height={220} unoptimized className="mx-auto mt-4 rounded-md border border-[#E5E7EB]" />
          <p className="mt-4 break-all text-xs text-[#6B7280]">{cardUrl}</p>
        </aside>
      </section>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <div className="mt-2 break-words text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
