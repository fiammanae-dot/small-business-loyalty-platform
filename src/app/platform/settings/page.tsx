import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
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
  { key: "demo-mode", label: "Action Restrictions", icon: FlaskConical },
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
      <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden">
        {params.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
        {params.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{params.success}</p> : null}

      <p className="text-[13px] text-[#7A8091]">Runtime configuration, security posture, and audit for the Loyalty Card UAE platform.</p>

      <nav className="flex gap-1 overflow-x-auto border-b border-[#E5E7EB] [scrollbar-gutter:stable]" role="tablist" aria-label="Platform settings sections">
        {settingsTabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/platform/settings?tab=${tab.key}`}
              role="tab"
              aria-selected={active}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition ${
                active ? "border-[#F97316] text-[#F97316]" : "border-transparent text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

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
      </div>
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
      <div className="flex items-center gap-3 rounded-xl border border-[#CBEAD6] bg-[#E9F6EE] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#CBEAD6] text-[#1D7A46]">
          <HeartPulse className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1D7A46]">All systems healthy</p>
          <p className="truncate text-xs text-[#4B7A5C]">{environmentName} environment · {databaseName} · v{packageJson.version ?? "-"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#CBEAD6] px-2.5 py-1 text-xs font-semibold text-[#0F6E56]">Operational</span>
      </div>

      <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <SectionHeader icon={Server} title="Environment Information" description="Read-only runtime details for the current Loyalty Card UAE instance." />
        <div className="mt-4 grid min-w-0 gap-3 md:mt-5 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard icon={GitBranch} label="Environment" value={environmentName} />
          <InfoCard icon={Database} label="Current Database" value={databaseName} />
          <InfoCard icon={FlaskConical} label="Action Restrictions" value={demoModeEnabled ? "Enabled" : "Disabled"} tone={demoModeEnabled ? "orange" : "gray"} />
          <InfoCard icon={PackageCheck} label="Application Version" value={packageJson.version ?? "Configured version unavailable"} />
          <InfoCard icon={HeartPulse} label="Build Status" value="Healthy" tone="green" />
          <InfoCard icon={Activity} label="Last Deployment" value={buildTimestamp || "Not Available"} />
        </div>
      </section>

      <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <SectionHeader icon={HeartPulse} title="Platform Health Summary" description="Compact operational metrics for the current database." />
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 md:mt-5 lg:grid-cols-4">
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

      <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <SectionHeader icon={ShieldCheck} title="Administration Links" description="Common platform administration destinations." />
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          <AdminLink href="/platform/database" label="System Health" description="Open database and Prisma health checks." />
          <AdminLink href="/platform/launch-readiness" label="Launch Readiness" description="Review the platform launch checklist." />
        </div>
      </section>
    </>
  );
}

function SecurityTab() {
  return (
    <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <SectionHeader icon={ShieldCheck} title="Security Administration" description="Current platform security posture and access controls." />
      <div className="mt-4 grid min-w-0 gap-4 md:mt-5 lg:grid-cols-3">
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
          title="Security integrations"
          items={["Single sign-on", "IP allow lists", "Admin approval workflows", "Security webhooks"]}
        />
      </div>
    </section>
  );
}

function NotificationsTab() {
  return (
    <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <SectionHeader icon={Bell} title="Notifications" description="Provider readiness and communication controls." />
      <div className="mt-4 grid min-w-0 gap-4 md:mt-5 lg:grid-cols-3">
        <RestrictionPanel
          title="Current Notification Controls"
          items={[
            { icon: MessageSquareOff, label: "Manual message preparation only" },
            { icon: Bell, label: "Business owner notification center" },
            { icon: Activity, label: "Alert lifecycle notifications" },
          ]}
        />
        <FutureCapabilitiesPanel
          sections={[
            { title: "Delivery Providers", items: ["WhatsApp Business API", "SMS gateway", "Transactional email", "Push notifications"] },
            { title: "Routing Rules", items: ["Channel fallback order", "Quiet hours", "Retry policies", "Provider health monitoring"] },
          ]}
        />
      </div>
    </section>
  );
}

function DemoModeTab({ demoModeEnabled }: { demoModeEnabled: boolean }) {
  return (
    <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader
          icon={FlaskConical}
          title="Action Restrictions"
          description="Controls that prevent selected external communications and payment actions when real-world actions should be paused."
        />
        <form action={toggleDemoModeAction}>
          <CsrfInput scope="platform:settings" />
          <input type="hidden" name="enabled" value={demoModeEnabled ? "false" : "true"} />
          <button type="submit" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
            {demoModeEnabled ? "Disable Restrictions" : "Enable Restrictions"}
          </button>
        </form>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 md:mt-5 lg:grid-cols-[260px_1fr_1fr]">
        <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Restriction Status</p>
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
          title="External Integrations Protected"
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
        Real customer communications remain paused while restrictions are active.
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
    <section className="max-w-full overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <SectionHeader icon={Activity} title="Audit Logs" description="Recent platform and business audit events. Full audit search and exports can be added later." />
      <div className="mt-4 grid min-w-0 gap-3 md:hidden">
        {auditEvents.map((event) => (
          <article key={event.id} className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">Audit event</p>
                <h3 className="mt-1 text-sm font-semibold text-[#111827]">{event.action.replaceAll("_", " ")}</h3>
              </div>
              <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#6B7280]">{formatDateTime(event.createdAt)}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <MobileDetailLine label="Entity" value={`${event.entityType}${event.entityId ? ` #${event.entityId}` : ""}`} />
              <MobileDetailLine label="Actor" value={event.actorUser?.name ?? event.actorUser?.email ?? "System"} />
              <MobileDetailLine label="Business" value={event.business?.name ?? "-"} />
            </div>
          </article>
        ))}
        {auditEvents.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] py-8 text-center text-sm text-[#6B7280]">No audit events recorded yet.</p> : null}
      </div>
      <div className="mt-5 hidden max-w-full overflow-x-auto md:block">
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
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 className="break-words text-lg font-semibold text-[#111827]">{title}</h2>
        <p className="mt-1 break-words text-sm leading-6 text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, tone = "gray" }: { icon: LucideIcon; label: string; value: string; tone?: "gray" | "green" | "orange" }) {
  const toneClass = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "orange" ? "text-[#F97316] bg-orange-50" : "text-[#6B7280] bg-[#FAFAFA]";

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-[#E7E9EE] p-4">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#6B7280]">
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <p className="mt-3 break-words text-base font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "gray" }: { icon: LucideIcon; label: string; value: string; tone?: "gray" | "green" | "orange" }) {
  const surfaceClass = tone === "green" ? "bg-[#EAF3DE]" : tone === "orange" ? "bg-[#FFFBF2]" : "bg-[#F8FAFC]";
  const labelClass = tone === "green" ? "text-[#3B6D11]" : tone === "orange" ? "text-[#B25E09]" : "text-[#64748B]";
  const valueClass = tone === "green" ? "text-[#3B6D11]" : tone === "orange" ? "text-[#B25E09]" : "text-[#111827]";

  return (
    <div className={`min-w-0 overflow-hidden rounded-lg p-3 ${surfaceClass}`}>
      <p className={`flex min-w-0 items-center gap-1.5 text-xs font-medium ${labelClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </p>
      <p className={`mt-1.5 break-words text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function RestrictionPanel({ title, items }: { title: string; items: Array<{ icon: LucideIcon; label: string }> }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <div className="mt-3 grid min-w-0 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2 rounded-md bg-[#FAFAFA] px-3 py-2 text-sm text-[#374151]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" />
            <item.icon className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
            <span className="min-w-0 break-words">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <div className="mt-3 grid min-w-0 gap-2">
        {items.map((item) => (
          <div key={item} className="min-w-0 break-words rounded-md bg-white px-3 py-2 text-sm text-[#6B7280]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FutureCapabilitiesPanel({ sections }: { sections: Array<{ title: string; items: string[] }> }) {
  return (
    <details className="min-w-0 overflow-hidden rounded-md border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-4 lg:col-span-2">
      <summary className="cursor-pointer list-none text-sm font-semibold text-[#111827]">
        Planned Capabilities
        <span className="mt-1 block text-sm font-normal leading-6 text-[#6B7280]">Planned provider and routing options. These are not active platform settings yet.</span>
      </summary>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <PlaceholderPanel key={section.title} title={section.title} items={section.items} />
        ))}
      </div>
    </details>
  );
}

function MobileDetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span className="shrink-0 text-[#6B7280]">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}
function AdminLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-lg border border-[#E7E9EE] p-4 transition hover:border-[#F97316]">
      <div className="min-w-0">
        <p className="break-words font-semibold text-[#111827]">{label}</p>
        <p className="mt-0.5 break-words text-sm text-[#6B7280]">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" aria-hidden="true" />
    </Link>
  );
}
