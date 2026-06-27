import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { ButtonLink, EmptyState, PageHeader, SectionCard, StatusBadge, Timeline, TimelineItem } from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { activityHref, customerProfileHref } from "@/lib/alert-investigation";
import { alertTypeLabel } from "@/lib/alert-labels";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/roles";
import { ArrowLeft, Bell, Clock, KeyRound, ShieldCheck, Stamp, UserRound } from "lucide-react";

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
    where: { id: staffUserId, businessId: user.businessId, role: { in: ["BRANCH_MANAGER", "STAFF"] } },
    include: {
      branch: true,
      stampTransactions: {
        where: { businessId: user.businessId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          branch: true,
          customerProgramMembership: {
            include: { loyaltyProgram: true, businessCustomerMembership: { include: { globalCustomer: true } } },
          },
        },
      },
      activityAlerts: {
        where: { businessId: user.businessId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { customerProgramMembership: { include: { loyaltyProgram: true, businessCustomerMembership: { include: { globalCustomer: true } } } } },
      },
    },
  });

  if (!staffUser) notFound();

  const failedLoginAttempts = await prisma.failedLoginAudit.count({
    where: { emailAttempted: staffUser.email, outcome: { in: ["FAILED", "LOCKED"] }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Team Member Profile" hideWelcomeMessage>
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
        <PageHeader
          eyebrow="Team Management"
          title={staffUser.name}
          description={`${roleLabels[staffUser.role]} assigned to ${staffUser.branch?.name ?? "no branch"}.`}
          actions={<ButtonLink href="/dashboard/staff" variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>Back to Team Management</ButtonLink>}
        />

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Profile" description="Core team member information.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Name" value={staffUser.name} icon={<UserRound className="h-4 w-4" />} />
              <Info label="Email" value={staffUser.email} />
              <Info label="Status" value={staffStatusBadge(staffUser.status)} />
              <Info label="Created" value={formatDateTime(staffUser.createdAt)} />
            </div>
          </SectionCard>

          <SectionCard title="Role" description="Access level and branch assignment.">
            <div className="grid gap-3">
              <Info label="Role" value={<StatusBadge tone={staffUser.role === "BRANCH_MANAGER" ? "info" : "neutral"}>{roleLabels[staffUser.role]}</StatusBadge>} icon={<ShieldCheck className="h-4 w-4" />} />
              <Info label="Assigned Branch" value={staffUser.branch?.name ?? "Unassigned"} />
              <Info label="Permissions Summary" value={staffUser.role === "BRANCH_MANAGER" ? "Can supervise branch operations, scan customers and redeem rewards." : "Can enroll customers, scan cards and issue stamps within assigned access."} />
            </div>
          </SectionCard>
        </section>

        <SectionCard title="Account Security" description="Login and password health for this account.">
          <div className="grid gap-3 md:grid-cols-4">
            <Info label="Last Login" value={staffUser.lastLoginAt ? formatDateTime(staffUser.lastLoginAt) : "Never"} icon={<Clock className="h-4 w-4" />} />
            <Info label="Password Last Changed" value={formatDateTime(staffUser.passwordChangedAt)} icon={<KeyRound className="h-4 w-4" />} />
            <Info label="Failed Login Attempts 24h" value={failedLoginAttempts} />
            <Info label="Password Change Required" value={staffUser.forcePasswordChange ? "Yes" : "No"} />
          </div>
        </SectionCard>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Recent Activity" description="Latest stamp issuance handled by this team member.">
            {staffUser.stampTransactions.length ? (
              <Timeline>
                {staffUser.stampTransactions.map((transaction) => {
                  const membership = transaction.customerProgramMembership.businessCustomerMembership;
                  const customer = membership.globalCustomer;
                  const isHighlighted = highlightedTransactionId === transaction.id;
                  return (
                    <TimelineItem
                      key={transaction.id}
                      marker={<Stamp className="h-3 w-3" />}
                      className={isHighlighted ? "rounded-md bg-orange-50 py-2" : undefined}
                      title={<Link href={activityHref(transaction.id, alertId) ?? "#"} className="business-text transition business-hover">{transaction.quantity} stamp{transaction.quantity === 1 ? "" : "s"} issued</Link>}
                      time={formatDateTime(transaction.createdAt)}
                      description={
                        <span>
                          {customer.firstName} {customer.lastName ?? ""} - {transaction.customerProgramMembership.loyaltyProgram.name} - {transaction.branch?.name ?? "No branch"}
                          {transaction.reason ? <span className="block">Reason: {transaction.reason}</span> : null}
                          <Link href={customerProfileHref(membership.uuid, alertId, transaction.id) ?? "#"} className="mt-1 inline-flex font-semibold business-text">Open Customer</Link>
                        </span>
                      }
                    />
                  );
                })}
              </Timeline>
            ) : (
              <EmptyState title="No recent staff activity" description="Stamp issuance activity for this team member will appear here." />
            )}
          </SectionCard>

          <SectionCard title="Generated Alerts" description="Operational alerts connected to this user.">
            {staffUser.activityAlerts.length ? (
              <Timeline>
                {staffUser.activityAlerts.map((alert) => (
                  <TimelineItem
                    key={alert.id}
                    marker={<Bell className="h-3 w-3" />}
                    className={alertId === alert.id ? "rounded-md bg-orange-50 py-2" : undefined}
                    title={<Link href={`/dashboard/notifications/${alert.id}`} className="business-text transition business-hover">{alertTypeLabel(alert.alertType)}</Link>}
                    time={formatDateTime(alert.createdAt)}
                    description={<span>{alert.description}<span className="mt-1 block font-semibold">Severity: {alert.severity}</span></span>}
                  />
                ))}
              </Timeline>
            ) : (
              <EmptyState title="No generated alerts" description="Security or activity alerts created by this team member will appear here." />
            )}
          </SectionCard>
        </section>

        <SectionCard title="Danger Zone" description="Sensitive access actions are available from the Team Management action menu and remain protected by confirmation prompts.">
          <p className="text-sm leading-6 text-[#64748B]">Use Reset Password, Enable or Disable from the staff list when account access needs to change. History remains preserved for audit and operational reporting.</p>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{icon ? <span aria-hidden>{icon}</span> : null}{label}</div>
      <div className="mt-2 break-words text-sm font-semibold text-[#0F172A]">{value}</div>
    </div>
  );
}

function staffStatusBadge(status: string) {
  return status === "ACTIVE" ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="danger">Disabled</StatusBadge>;
}
