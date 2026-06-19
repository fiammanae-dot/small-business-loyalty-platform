import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { reviewActivityAlertAction } from "@/app/dashboard/notifications/actions";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { activityHref, customerProfileHref, findRelatedStampTransaction, staffProfileHref } from "@/lib/alert-investigation";
import { alertTypeLabel } from "@/lib/alert-labels";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const alertId = Number(id);
  if (!alertId) notFound();

  const alert = await prisma.activityAlert.findFirst({
    where: { id: alertId, businessId: user.businessId },
    include: {
      branch: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      reviewer: { select: { name: true, email: true } },
      assignedToUser: { select: { name: true, email: true } },
      resolvedByUser: { select: { name: true, email: true } },
      dismissedByUser: { select: { name: true, email: true } },
      alertEvents: {
        orderBy: { createdAt: "desc" },
        include: { actorUser: { select: { name: true, email: true } } },
      },
      customerProgramMembership: {
        include: {
          loyaltyProgram: true,
          businessCustomerMembership: {
            include: { globalCustomer: true },
          },
        },
      },
    },
  });

  if (!alert) notFound();

  const customer = alert.customerProgramMembership?.businessCustomerMembership.globalCustomer;
  const customerName = customer ? `${customer.firstName} ${customer.lastName ?? ""}` : "-";
  const relatedTransaction = await findRelatedStampTransaction(alert);
  const customerHref = customerProfileHref(
    alert.customerProgramMembership?.businessCustomerMembership.uuid,
    alert.id,
    relatedTransaction?.id,
  );
  const staffHref = staffProfileHref(alert.user?.id, alert.id, relatedTransaction?.id);
  const relatedActivityHref = activityHref(relatedTransaction?.id, alert.id);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Alert detail">
      <div>
        <Link href="/dashboard/notifications" className="text-sm font-semibold business-text">
          Back to notifications
        </Link>
      </div>
      <section className="flex flex-wrap gap-3">
        {customerHref ? <ActionLink href={customerHref} label="View Customer" /> : null}
        {staffHref ? <ActionLink href={staffHref} label="View Staff" /> : null}
        {relatedActivityHref ? <ActionLink href={relatedActivityHref} label="View Activity" /> : null}
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Severity" value={alert.severity} />
          <Info label="Priority" value={alert.priority} />
          <Info label="Risk score" value={alert.riskScore.toString()} />
          <Info label="Occurrences" value={alert.occurrenceCount.toString()} />
          <Info
            label="Alert type"
            value={
              relatedActivityHref ? (
                <Link href={relatedActivityHref} className="business-text">
                  {alertTypeLabel(alert.alertType)}
                </Link>
              ) : (
                alertTypeLabel(alert.alertType)
              )
            }
          />
          <Info label="Status" value={alert.status} />
          <Info label="Customer" value={customerName} />
          <Info label="Staff" value={alert.user?.name ?? "-"} />
          <Info label="Branch" value={alert.branch?.name ?? "-"} />
          <Info label="Program" value={alert.customerProgramMembership?.loyaltyProgram.name ?? "-"} />
          <Info label="Created at" value={formatDateTime(alert.createdAt)} />
          <Info label="Reviewed by" value={alert.reviewer?.name ?? "-"} />
          <Info label="Reviewed at" value={alert.reviewedAt ? formatDateTime(alert.reviewedAt) : "-"} />
          <Info label="Assigned owner" value={alert.assignedToUser?.name ?? "-"} />
          <Info label="Escalated at" value={alert.escalatedAt ? formatDateTime(alert.escalatedAt) : "-"} />
          <Info label="Escalation reason" value={alert.escalationReason ?? "-"} wide />
          <Info label="Description" value={alert.description} wide />
          <Info label="Review note" value={alert.reviewNote ?? "-"} wide />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Alert history</h2>
        <div className="mt-5 grid gap-3">
          {alert.alertEvents.map((event) => (
            <div key={event.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{event.eventType.replaceAll("_", " ").toLowerCase()}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">By {event.actorUser?.name ?? "System"}</p>
                </div>
                <p className="text-sm text-[#6B7280]">{formatDateTime(event.createdAt)}</p>
              </div>
            </div>
          ))}
          {alert.alertEvents.length === 0 ? <p className="text-sm text-[#6B7280]">No alert history yet.</p> : null}
        </div>
      </section>

      {!["RESOLVED", "DISMISSED", "REVIEWED"].includes(alert.status) ? (
        <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Manage alert</h2>
          <form action={reviewActivityAlertAction} className="mt-5 grid gap-4">
            <CsrfInput scope="dashboard:notifications" />
            <input type="hidden" name="alertId" value={alert.id} />
            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Priority
              <select name="priority" defaultValue={alert.priority} className="h-11 rounded-md border border-[#E5E7EB] px-3 text-sm font-normal">
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Review note
              <textarea name="reviewNote" rows={4} className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-normal outline-none business-ring focus:ring-0" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Escalation reason
              <input name="escalationReason" className="h-11 rounded-md border border-[#E5E7EB] px-3 text-sm font-normal outline-none business-ring focus:ring-0" />
            </label>
            <div className="flex gap-3">
              <button name="status" value="UNDER_REVIEW" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
                Under Review
              </button>
              <button name="status" value="ESCALATED" className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">
                Escalate
              </button>
              <button name="status" value="RESOLVED" className="rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">
                Resolve
              </button>
              <button name="status" value="DISMISSED" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
                Dismissed
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </DashboardShell>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-md border business-border px-4 py-2 text-sm font-semibold business-text transition business-hover">
      {label}
    </Link>
  );
}

function Info({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#E5E7EB] bg-white p-4 ${wide ? "md:col-span-3" : ""}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
