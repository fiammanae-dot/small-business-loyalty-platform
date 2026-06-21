import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { activityHref, customerProfileHref } from "@/lib/alert-investigation";
import { alertTypeLabel } from "@/lib/alert-labels";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/roles";

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alert?: string; highlightTransaction?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const staffUserId = Number(id);
  const highlightedTransactionId = qs.highlightTransaction ? Number(qs.highlightTransaction) : null;
  const alertId = qs.alert ? Number(qs.alert) : undefined;
  if (!staffUserId) notFound();

  const staffUser = await prisma.user.findFirst({
    where: {
      id: staffUserId,
      businessId: user.businessId,
      role: { in: ["BRANCH_MANAGER", "STAFF"] },
    },
    include: {
      branch: true,
      stampTransactions: {
        where: { businessId: user.businessId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          branch: true,
          customerProgramMembership: {
            include: {
              loyaltyProgram: true,
              businessCustomerMembership: {
                include: { globalCustomer: true },
              },
            },
          },
        },
      },
      activityAlerts: {
        where: { businessId: user.businessId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          customerProgramMembership: {
            include: {
              loyaltyProgram: true,
              businessCustomerMembership: { include: { globalCustomer: true } },
            },
          },
        },
      },
    },
  });

  if (!staffUser) notFound();

  const failedLoginAttempts = await prisma.failedLoginAudit.count({
    where: {
      emailAttempted: staffUser.email,
      outcome: { in: ["FAILED", "LOCKED"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Staff profile">
      <div>
        <Link href="/dashboard/staff" className="text-sm font-semibold business-primary">
          Back to staff
        </Link>
      </div>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Name" value={staffUser.name} />
          <Info label="Email" value={staffUser.email} />
          <Info label="Role" value={roleLabels[staffUser.role]} />
          <Info label="Branch" value={staffUser.branch?.name ?? "-"} />
          <Info label="Status" value={<StatusBadge status={staffUser.status} />} />
          <Info label="Created" value={formatDateTime(staffUser.createdAt)} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Account security</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Info label="Last login" value={staffUser.lastLoginAt ? formatDateTime(staffUser.lastLoginAt) : "-"} />
          <Info label="Password last changed" value={formatDateTime(staffUser.passwordChangedAt)} />
          <Info label="Failed login attempts (24h)" value={failedLoginAttempts} />
          <Info label="Password change required" value={staffUser.forcePasswordChange ? "Yes" : "No"} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Stamp issuance history</h2>
        <div className="mt-5 grid gap-3">
          {staffUser.stampTransactions.map((transaction) => {
            const membership = transaction.customerProgramMembership.businessCustomerMembership;
            const customer = membership.globalCustomer;
            const isHighlighted = highlightedTransactionId === transaction.id;
            return (
              <div
                key={transaction.id}
                className={`rounded-md border p-4 ${isHighlighted ? "border-[#F97316] bg-orange-50" : "border-[#E5E7EB] bg-white"}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link href={activityHref(transaction.id, alertId) ?? "#"} className="font-semibold business-primary">
                      Activity #{transaction.id}
                    </Link>
                    <p className="mt-1 text-sm text-[#111827]">
                      {transaction.quantity} stamp{transaction.quantity === 1 ? "" : "s"} issued to {customer.firstName} {customer.lastName ?? ""}
                    </p>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {transaction.customerProgramMembership.loyaltyProgram.name} • {transaction.branch?.name ?? "-"} • {formatDateTime(transaction.createdAt)}
                    </p>
                  </div>
                  <Link href={customerProfileHref(membership.uuid, alertId, transaction.id) ?? "#"} className="text-sm font-semibold business-primary">
                    View Customer
                  </Link>
                </div>
                {transaction.reason ? <p className="mt-3 text-sm text-[#6B7280]">Reason: {transaction.reason}</p> : null}
              </div>
            );
          })}
          {staffUser.stampTransactions.length === 0 ? <p className="text-sm text-[#6B7280]">No stamp transactions issued by this user.</p> : null}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Generated alerts history</h2>
        <div className="mt-5 grid gap-3">
          {staffUser.activityAlerts.map((alert) => (
            <Link
              key={alert.id}
              href={`/dashboard/notifications/${alert.id}`}
              className={`rounded-md border p-4 transition business-hover ${alertId === alert.id ? "border-[#F97316] bg-orange-50" : "border-[#E5E7EB] bg-white"}`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{alertTypeLabel(alert.alertType)}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{alert.description}</p>
                </div>
                <p className="text-sm font-semibold business-primary">{alert.severity}</p>
              </div>
            </Link>
          ))}
          {staffUser.activityAlerts.length === 0 ? <p className="text-sm text-[#6B7280]">No generated alerts for this user.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
