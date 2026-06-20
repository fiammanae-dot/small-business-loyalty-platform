import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  Database,
  FlaskConical,
  GitBranch,
  HeartPulse,
  KeyRound,
  Link2Off,
  Lock,
  Mail,
  MessageSquareOff,
  PackageCheck,
  RadioTower,
  Receipt,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityAlertStatus } from "@prisma/client";
import Link from "next/link";
import packageJson from "../../../../package.json";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileTabSelector } from "@/components/MobileTabSelector";
import { formatDateTime } from "@/lib/format";
import { isDemoModeEnabled } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { toggleDemoModeAction } from "@/app/platform/settings/actions";

const activeAlertStatuses: ActivityAlertStatus[] = ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED"];
const settingsTabs = [
  { key: "general", label: "General", icon: Server },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "demo-mode", label: "Demo Mode", icon: FlaskConical },
  { key: "audit-logs", label: "Audit Logs", icon: Activity },
] as const;

type SettingsTab = (typeof settingsTabs)[number]["key"];

export default async function PlatformSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const activeTab = normalizeTab(params.tab);
  const demoModeEnabled = await isDemoModeEnabled();

  const [businesses, users, branches, programs, customers, activeSubscriptions, openAlerts, auditEvents] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.branch.count(),
    prisma.loyaltyProgram.count(),
    prisma.globalCustomer.count(),
    prisma.businessSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.activityAlert.count({ where: { status: { in: activeAlertStatuses } } }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        actorUser: { select: { name: true, email: true } },
        business: { select: { name: true } },
      },
    }),
  ]);

  const databaseName = getDatabaseName();
  const environmentName = getEnvironmentName(databaseName);
  const buildTimestamp = process.env.BUILD_TIMESTAMP ?? process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "";

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Platform settings">
      {params.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
      {params.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{params.success}</p> : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm">
        <MobileTabSelector
          label="Settings section"
          activeValue={activeTab}
          basePath="/platform/settings"
          options={settingsTabs.map((tab) => ({ value: tab.key, label: tab.label }))}
        />
        <div className="hidden gap-2 overflow-x-auto md:flex" role="tablist" aria-label="Platform settings sections">
          {settingsTabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/platform/settings?tab=${tab.key}`}
                role="tab"
                aria-selected={active}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-orange-50 text-[#F97316]" : "text-[#6B7280] hover:bg-orange-50 hover:text-[#F97316]"
                }`}
              >
                <tab.icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </section>

      {activeTab === "general" ? (
        <GeneralTab
          environmentName={environmentName}
          databaseName={databaseName}
          demoModeEnabled={demoModeEnabled}
          buildTimestamp={buildTimestamp}
          businesses={businesses}
          users={users}
          branches={branches}
          programs={programs}
          customers={customers}
          activeSubscriptions={activeSubscriptions}
          openAlerts={openAlerts}
        />
      ) : null}

      {activeTab === "security" ? <SecurityTab /> : null}

      {activeTab === "notifications" ? <NotificationsTab /> : null}

      {activeTab === "demo-mode" ? <DemoModeTab demoModeEnabled={demoModeEnabled} /> : null}

      {activeTab === "audit-logs" ? <AuditLogsTab auditEvents={auditEvents} /> : null}
    </DashboardShell>
  );
}

function GeneralTab({
  environmentName,
  databaseName,
  demoModeEnabled,
  buildTimestamp,
  businesses,
  users,
  branches,
  programs,
  customers,
  activeSubscriptions,
  openAlerts,
}: {
  environmentName: string;
  databaseName: string;
  demoModeEnabled: boolean;
  buildTimestamp: string;
  businesses: number;
  users: number;
  branches: number;
  programs: number;
  customers: number;
  activeSubscriptions: number;
  openAlerts: number;
}) {
  return (
    <>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <SectionHeader icon={Server} title="Environment Information" description="Read-only runtime details for the current LoyaltyBase instance." />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard icon={GitBranch} label="Environment" value={environmentName} />
          <InfoCard icon={Database} label="Current Database" value={databaseName} />
          <InfoCard icon={FlaskConical} label="Demo Mode" value={demoModeEnabled ? "Enabled" : "Disabled"} tone={demoModeEnabled ? "orange" : "gray"} />
          <InfoCard icon={PackageCheck} label="Application Version" value={packageJson.version ?? "Configured version unavailable"} />
          <InfoCard icon={HeartPulse} label="Build Status" value="Healthy" tone="green" />
          <InfoCard icon={Activity} label="Last Deployment" value={buildTimestamp || "Not Available"} />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <SectionHeader icon={HeartPulse} title="Platform Health Summary" description="Compact operational metrics for the current database." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Building2} label="Businesses" value={businesses.toString()} />
          <MetricCard icon={Users} label="Users" value={users.toString()} />
          <MetricCard icon={RadioTower} label="Branches" value={branches.toString()} />
          <MetricCard icon={PackageCheck} label="Programs" value={programs.toString()} />
          <MetricCard icon={Users} label="Customers" value={customers.toString()} />
          <MetricCard icon={Receipt} label="Active Subscriptions" value={activeSubscriptions.toString()} />
          <MetricCard icon={Bell} label="Alerts" value={`${openAlerts} Open`} tone={openAlerts > 0 ? "orange" : "green"} />
          <MetricCard icon={ShieldCheck} label="System Status" value="Healthy" tone="green" />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <SectionHeader icon={ShieldCheck} title="Administration Links" description="Common platform administration destinations." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <AdminLink href="/platform/database" label="System Health" description="Open database and Prisma health checks." />
          <AdminLink href="/platform/launch-readiness" label="Launch Readiness" description="Review the platform launch checklist." />
        </div>
      </section>
    </>
  );
}

function SecurityTab() {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <SectionHeader icon={ShieldCheck} title="Security Administration" description="Current platform security posture and future hardening controls." />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <RestrictionPanel
          title="Active Protections"
          items={[
            { icon: Lock, label: "Role-based access control" },
            { icon: KeyRound, label: "CSRF protection on mutating actions" },
            { icon: ShieldCheck, label: "Login rate limiting and failed login audit" },
          ]}
        />
        <RestrictionPanel
          title="Tenant Safety"
          items={[
            { icon: Building2, label: "Business-scoped customer data" },
            { icon: RadioTower, label: "Branch status enforcement" },
            { icon: Activity, label: "Audit trail foundation" },
          ]}
        />
        <PlaceholderPanel
          title="Future Security Integrations"
          items={["Single sign-on", "IP allow lists", "Admin approval workflows", "Security webhooks"]}
        />
      </div>
    </section>
  );
}

function NotificationsTab() {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <SectionHeader icon={Bell} title="Notifications" description="Provider readiness and future communication controls." />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <RestrictionPanel
          title="Current Notification Controls"
          items={[
            { icon: MessageSquareOff, label: "Manual message preparation only" },
            { icon: Bell, label: "Business owner notification center" },
            { icon: Activity, label: "Alert lifecycle notifications" },
          ]}
        />
        <PlaceholderPanel title="Future Delivery Providers" items={["WhatsApp Business API", "SMS gateway", "Transactional email", "Push notifications"]} />
        <PlaceholderPanel title="Future Routing Rules" items={["Channel fallback order", "Quiet hours", "Retry policies", "Provider health monitoring"]} />
      </div>
    </section>
  );
}

function DemoModeTab({ demoModeEnabled }: { demoModeEnabled: boolean }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader
          icon={FlaskConical}
          title="Demo Mode"
          description="Demo Mode is intended for product demonstrations, staff training, QA testing, and user acceptance testing."
        />
        <form action={toggleDemoModeAction}>
          <CsrfInput scope="platform:settings" />
          <input type="hidden" name="enabled" value={demoModeEnabled ? "false" : "true"} />
          <button type="submit" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
            {demoModeEnabled ? "Disable Demo Mode" : "Enable Demo Mode"}
          </button>
        </form>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr_1fr]">
        <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Demo Mode Status</p>
          <p className={`mt-3 inline-flex rounded-md px-3 py-2 text-sm font-semibold ${demoModeEnabled ? "bg-orange-50 text-[#F97316]" : "bg-zinc-100 text-zinc-700"}`}>
            {demoModeEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>

        <RestrictionPanel
          title="Current Restrictions"
          items={[
            { icon: MessageSquareOff, label: "Manual message sending blocked" },
            { icon: Receipt, label: "Invoice payment recording blocked" },
          ]}
        />

        <RestrictionPanel
          title="Future Integrations Protected"
          items={[
            { icon: Mail, label: "Email sending" },
            { icon: Smartphone, label: "SMS sending" },
            { icon: MessageSquareOff, label: "WhatsApp sending" },
            { icon: RadioTower, label: "Campaign delivery" },
            { icon: Link2Off, label: "External integrations" },
          ]}
        />
      </div>

      <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#C2410C]">
        No real customer communications will be sent while Demo Mode protections are active.
      </div>
    </section>
  );
}

function AuditLogsTab({
  auditEvents,
}: {
  auditEvents: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: Date;
    actorUser: { name: string; email: string } | null;
    business: { name: string } | null;
  }>;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <SectionHeader icon={Activity} title="Audit Logs" description="Recent platform and business audit events. Full audit search and exports can be added later." />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[#6B7280]">
              {["Action", "Entity", "Actor", "Business", "Created At"].map((heading) => (
                <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditEvents.map((event) => (
              <tr key={event.id}>
                <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{event.action.replaceAll("_", " ")}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.actorUser?.name ?? event.actorUser?.email ?? "System"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{event.business?.name ?? "-"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDateTime(event.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditEvents.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No audit events recorded yet.</p> : null}
      </div>
    </section>
  );
}

function getDatabaseName() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return "Not Configured";
  }

  try {
    return new URL(databaseUrl).pathname.replace("/", "") || "Unknown";
  } catch {
    return "Unknown";
  }
}

function getEnvironmentName(databaseName: string) {
  const configured = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV;
  if (configured) {
    return toTitleCase(configured);
  }
  if (databaseName === "loyalty_platform_pilot") {
    return "Pilot";
  }
  if (process.env.NODE_ENV === "production") {
    return "Production";
  }
  return "Development";
}

function normalizeTab(tab?: string): SettingsTab {
  return settingsTabs.some((item) => item.key === tab) ? (tab as SettingsTab) : "general";
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, tone = "gray" }: { icon: LucideIcon; label: string; value: string; tone?: "gray" | "green" | "orange" }) {
  const toneClass = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "orange" ? "text-[#F97316] bg-orange-50" : "text-[#6B7280] bg-[#FAFAFA]";

  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[#6B7280]">
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {label}
      </div>
      <p className="mt-3 break-words text-base font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "gray" }: { icon: LucideIcon; label: string; value: string; tone?: "gray" | "green" | "orange" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "orange" ? "bg-orange-50 text-[#F97316]" : "bg-[#FAFAFA] text-[#6B7280]";

  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function RestrictionPanel({ title, items }: { title: string; items: Array<{ icon: LucideIcon; label: string }> }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-md bg-[#FAFAFA] px-3 py-2 text-sm text-[#374151]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" />
            <item.icon className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-md bg-white px-3 py-2 text-sm text-[#6B7280]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="rounded-md border border-[#E5E7EB] p-4 transition hover:border-[#F97316]">
      <p className="font-semibold text-[#111827]">{label}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
    </Link>
  );
}
