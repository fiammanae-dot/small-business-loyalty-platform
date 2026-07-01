import type { Prisma, UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { PlatformUserPasswordResetAction } from "@/components/PlatformUserPasswordResetAction";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getDisplayUserName, roleLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { createCsrfToken } from "@/lib/csrf";
import { archivePlatformUserAction, forceLogoutPlatformUserAction, setPlatformUserStatusAction } from "../actions";

type PlatformUserDetail = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    lastLoginAt: true;
    passwordChangedAt: true;
    forcePasswordChange: true;
    sessionVersion: true;
    business: { select: { name: true; subscriptions: { select: { status: true; subscriptionPlan: { select: { name: true } } }; orderBy: { createdAt: "desc" }; take: 1 } } };
    branch: { select: { name: true } };
  };
}>;

type AuditRow = Prisma.AuditEventGetPayload<{
  select: {
    id: true;
    action: true;
    entityType: true;
    entityId: true;
    createdAt: true;
    actorUser: { select: { name: true; email: true } };
  };
}>;

export default async function PlatformUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireRole("PLATFORM_OWNER");
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isFinite(userId)) {
    notFound();
  }

  const [user, auditEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        forcePasswordChange: true,
        sessionVersion: true,
        business: {
          select: {
            name: true,
            subscriptions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { status: true, subscriptionPlan: { select: { name: true } } },
            },
          },
        },
        branch: { select: { name: true } },
      },
    }),
    prisma.auditEvent.findMany({
      where: {
        OR: [
          { entityType: "user", entityId: String(userId) },
          { actorUserId: userId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorUser: { select: { name: true, email: true } },
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const failedLoginCount = await prisma.failedLoginAudit.count({ where: { email: user.email } }).catch(() => 0);
  const displayName = getDisplayUserName(user);
  const plan = user.business?.subscriptions[0]?.subscriptionPlan.name ?? "Not available";

  return (
    <DashboardShell user={currentUser} eyebrow="System Administrator" title="User details">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="grid gap-5">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-[#6B7280]">Overview</p>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#111827] text-xl font-black text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-tight text-[#111827]">{displayName}</h2>
                  <p className="mt-1 break-all font-mono text-sm text-[#6B7280]">{user.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <RoleBadge role={user.role} />
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              </div>
              <Link href="/platform/users" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]">
                Back to Users
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoTile label="Created" value={formatDate(user.createdAt)} />
              <InfoTile label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"} />
              <InfoTile label="Updated" value={formatDate(user.updatedAt)} />
              <InfoTile label="Session version" value={String(user.sessionVersion)} />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <DetailSection title="Account" description="Core identity and locale details.">
              <Detail label="Email" value={user.email} />
              <Detail label="Phone" value="Not configured" />
              <Detail label="Username" value="Not configured" />
              <Detail label="Language" value="Default" />
              <Detail label="Timezone" value="Default" />
            </DetailSection>

            <DetailSection title="Business Assignment" description="Tenant and branch scope for this account.">
              <Detail label="Business" value={user.business?.name ?? "-"} />
              <Detail label="Branch" value={user.branch?.name ?? "-"} />
              <Detail label="Role" value={roleLabels[user.role]} />
              <Detail label="Plan" value={plan} />
            </DetailSection>
          </section>

          <DetailSection title="Security" description="Current access posture and password state.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoTile label="Password status" value={user.forcePasswordChange ? "Reset required" : "Active"} />
              <InfoTile label="Last password reset" value={formatDate(user.passwordChangedAt)} />
              <InfoTile label="Active sessions" value={`Session version ${user.sessionVersion}`} />
              <InfoTile label="MFA" value="Not configured" />
              <InfoTile label="Failed logins" value={String(failedLoginCount)} />
            </div>
          </DetailSection>

          <section className="grid gap-5 lg:grid-cols-2">
            <TimelineSection title="Recent Activity" description="Latest user-related platform events." events={auditEvents.slice(0, 4)} empty="No recent activity recorded." />
            <TimelineSection title="Audit History" description="Audit events tied to this user account." events={auditEvents} empty="No audit history recorded." />
          </section>
        </div>

        <UserActionsPanel user={user} currentUserId={currentUser.id} />
      </div>
    </DashboardShell>
  );
}

function UserActionsPanel({ user, currentUserId }: { user: PlatformUserDetail; currentUserId: number }) {
  const displayName = getDisplayUserName(user);
  const isCurrentUser = user.id === currentUserId;
  const statusAction = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  const statusLabel = statusAction === "ACTIVE" ? "Reactivate" : "Suspend";
  let statusMessage = "Suspend this user? They will lose workspace access.";

  if (statusAction === "ACTIVE") {
    statusMessage = "Reactivate this user and restore login access?";
  }
  if (statusAction !== "ACTIVE" && user.role === "PLATFORM_OWNER") {
    statusMessage = "Suspend this System Administrator? This is a dangerous platform access change.";
  }

  return (
    <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm xl:sticky xl:top-6">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6B7280]">Actions</p>
      <div className="mt-4 grid gap-2">
        <Link href={`/platform/users/${user.id}/edit`} className="inline-flex h-10 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600">
          Edit User
        </Link>
        <PlatformUserPasswordResetAction userId={user.id} userName={displayName} csrfToken={createCsrfToken("platform:users")} />
        <form action={forceLogoutPlatformUserAction}>
          <CsrfInput scope="platform:users" />
          <input type="hidden" name="userId" value={user.id} />
          <ConfirmSubmitButton message="Force this user to log out of active sessions?" confirmLabel="Force logout" className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]">
            Force Logout
          </ConfirmSubmitButton>
        </form>
        <Link href={`/platform/audit-center?entityType=user&search=${encodeURIComponent(user.email)}`} className="inline-flex h-10 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]">
          View Audit History
        </Link>
      </div>

      <div className="mt-5 border-t border-[#E5E7EB] pt-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Danger Zone</p>
        <div className="mt-3 grid gap-2">
          <form action={setPlatformUserStatusAction}>
            <CsrfInput scope="platform:users" />
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="nextStatus" value={statusAction} />
            <ConfirmSubmitButton
              message={statusMessage}
              confirmLabel={statusLabel}
              disabled={isCurrentUser}
              className={statusAction === "ACTIVE" ? "inline-flex h-10 w-full items-center justify-center rounded-md border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50" : "inline-flex h-10 w-full items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"}
            >
              {statusLabel}
            </ConfirmSubmitButton>
          </form>
          {user.status !== "ARCHIVED" ? (
            <form action={archivePlatformUserAction}>
              <CsrfInput scope="platform:users" />
              <input type="hidden" name="userId" value={user.id} />
              <ConfirmSubmitButton message="Archive this user? They cannot log in, but all history will be preserved." confirmLabel="Archive" disabled={isCurrentUser} className="inline-flex h-10 w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                Archive
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function DetailSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#6B7280]">{description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-2 break-words font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function TimelineSection({ title, description, events, empty }: { title: string; description: string; events: AuditRow[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#6B7280]">{description}</p>
      {events.length ? (
        <ol className="mt-5 grid gap-4">
          {events.map((event) => (
            <li key={event.id} className="relative border-l-2 border-[#E5E7EB] pl-4">
              <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#F97316]" aria-hidden="true" />
              <p className="text-sm font-black text-[#111827]">{formatAction(event.action)}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{formatDateTime(event.createdAt)} by {event.actorUser?.name ?? event.actorUser?.email ?? "System"}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-md border border-dashed border-[#CBD5E1] bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">{empty}</p>
      )}
    </section>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const tone =
    role === "PLATFORM_OWNER"
      ? "border-purple-200 bg-purple-50 text-purple-700"
      : role === "BUSINESS_OWNER"
        ? "border-orange-200 bg-orange-50 text-[#C2410C]"
        : role === "BRANCH_MANAGER"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>{roleLabels[role]}</span>;
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
