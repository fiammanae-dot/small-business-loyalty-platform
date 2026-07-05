import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  FileDown,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Link2Off,
  Lock,
  Mail,
  MessageSquare,
  MessageSquareOff,
  RadioTower,
  Receipt,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityAlertStatus } from "@prisma/client";
import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { toggleDemoModeAction } from "@/app/platform/settings/actions";
import { formatDateTime } from "@/lib/format";
import { demoModeRestrictions, isDemoModeEnabled } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const activeAlertStatuses: ActivityAlertStatus[] = ["OPEN", "ASSIGNED", "UNDER_REVIEW", "ESCALATED"];

const settingsTabs = [
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "communications", label: "Communications", icon: Bell },
  { key: "restrictions", label: "Action Restrictions", icon: FlaskConical },
  { key: "audit-logs", label: "Audit Logs", icon: Activity },
  { key: "integrations", label: "Integrations", icon: Server },
  { key: "maintenance", label: "Maintenance", icon: HeartPulse },
] as const;

type SettingsTab = (typeof settingsTabs)[number]["key"];

type AuditEventRow = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: Date;
  actorUser: { name: string; email: string } | null;
  business: { name: string } | null;
};

export default async function PlatformSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const activeTab = normalizeTab(params.tab);
  const demoModeEnabled = await isDemoModeEnabled();

  const [businesses, users, activeSubscriptions, openAlerts, preparedMessages, auditEvents] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.businessSubscription.count({ where: { status: { in: ["TRIAL", "ACTIVE"] } } }),
    prisma.activityAlert.count({ where: { status: { in: activeAlertStatuses } } }),
    prisma.messageDeliveryQueue.count(),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actorUser: { select: { name: true, email: true } },
        business: { select: { name: true } },
      },
    }),
  ]);

  const databaseName = getDatabaseName();
  const environmentName = getEnvironmentName(databaseName);
  const operationalState = {
    databaseName,
    environmentName,
    demoModeEnabled,
    businesses,
    users,
    activeSubscriptions,
    openAlerts,
    preparedMessages,
    sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
    appUrlConfigured: hasAnyEnv(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL", "APP_URL", "AUTH_URL", "NEXTAUTH_URL", "BASE_URL"]),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    passwordResetSenderConfigured: Boolean(process.env.PASSWORD_RESET_FROM_EMAIL),
    storageConfigured: hasAnyEnv(["BLOB_READ_WRITE_TOKEN", "VERCEL_BLOB_READ_WRITE_TOKEN", "S3_BUCKET", "AWS_ACCESS_KEY_ID"]),
    paymentProviderConfigured: hasAnyEnv(["STRIPE_SECRET_KEY", "PAYMENT_PROVIDER_SECRET"]),
    whatsappSupportConfigured: true,
  };

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Platform settings">
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
        {params.error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        {params.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{params.success}</p> : null}

        <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#F97316]">Operational configuration center</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#111827]">Control real platform readiness from one place.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">
                View security posture, provider readiness, action restrictions, audit activity, integrations, and launch operations without exposing secrets.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <StatusBadge label={operationalState.demoModeEnabled ? "Restrictions Enabled" : "Restrictions Disabled"} tone={operationalState.demoModeEnabled ? "warning" : "neutral"} />
              <StatusBadge label={operationalState.resendConfigured ? "Email Configured" : "Email Missing"} tone={operationalState.resendConfigured ? "success" : "danger"} />
              <StatusBadge label={`${openAlerts} Open Alerts`} tone={openAlerts > 0 ? "warning" : "success"} />
            </div>
          </div>
        </section>

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

        {activeTab === "security" ? <SecurityTab state={operationalState} /> : null}
        {activeTab === "communications" ? <CommunicationsTab state={operationalState} /> : null}
        {activeTab === "restrictions" ? <RestrictionsTab demoModeEnabled={demoModeEnabled} /> : null}
        {activeTab === "audit-logs" ? <AuditLogsTab auditEvents={auditEvents} /> : null}
        {activeTab === "integrations" ? <IntegrationsTab state={operationalState} /> : null}
        {activeTab === "maintenance" ? <MaintenanceTab state={operationalState} /> : null}
      </div>
    </DashboardShell>
  );
}

function SecurityTab({ state }: { state: ReturnType<typeof buildStateType> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
        <SectionHeader icon={ShieldCheck} title="Security posture" description="Real protections currently enforced by platform code and environment configuration." />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <StatusRow icon={KeyRound} label="Session secret status" value={state.sessionSecretConfigured ? "Configured" : "Missing"} tone={state.sessionSecretConfigured ? "success" : "danger"} detail={state.sessionSecretConfigured ? "SESSION_SECRET is present. Secret values are never displayed." : "SESSION_SECRET is missing. Production fails closed when it is absent."} />
          <StatusRow icon={Clock3} label="Session duration" value="8 hours" tone="success" detail="Backed by the signed session cookie TTL in src/lib/session.ts." />
          <StatusRow icon={Lock} label="CSRF protection status" value="Enabled" tone="success" detail="Mutating forms use scoped CSRF tokens." />
          <StatusRow icon={ShieldCheck} label="Login rate limiting status" value="Enabled" tone="success" detail="Failed login attempts are rate limited and audited." />
          <StatusRow icon={KeyRound} label="Password reset rate limiting status" value="Enabled" tone="success" detail="Password reset requests are limited per user window." />
          <StatusRow icon={Users} label="Public join rate limiting status" value="Not configured" tone="neutral" detail="No dedicated public join rate-limit helper exists yet." />
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
        <SectionHeader icon={ExternalLink} title="Security operations" description="Use the existing operational pages for investigation and access management." />
        <div className="mt-5 grid gap-3">
          <AdminLink href="/platform/audit-center" label="View audit center" description="Search, filter, and export platform audit events." />
          <AdminLink href="/platform/users" label="Manage users" description="Review roles, status, sessions, and user lifecycle actions." />
          <AdminLink href="/platform/operations-center" label="Open operations center" description="Review support sessions and operational access requests." />
        </div>
      </section>
    </div>
  );
}

function CommunicationsTab({ state }: { state: ReturnType<typeof buildStateType> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
        <SectionHeader icon={Bell} title="Provider readiness" description="Read-only provider status from environment configuration and existing message queues." />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <StatusRow icon={Mail} label="Resend/email provider status" value={state.resendConfigured ? "Configured" : "Missing"} tone={state.resendConfigured ? "success" : "danger"} detail="Checks RESEND_API_KEY presence only. The secret is not exposed." />
          <StatusRow icon={Mail} label="Password reset sender status" value={state.passwordResetSenderConfigured ? "Configured" : "Missing"} tone={state.passwordResetSenderConfigured ? "success" : "danger"} detail="Checks PASSWORD_RESET_FROM_EMAIL presence only." />
          <StatusRow icon={Smartphone} label="WhatsApp support number status" value="Configured" tone="success" detail="Business Owner support history links to the approved manual WhatsApp support number." />
          <StatusRow icon={MessageSquare} label="Manual messages status" value={`${state.preparedMessages} prepared`} tone="success" detail="Messages are queued for manual handling. No provider automation is enabled here." />
          <StatusRow icon={RadioTower} label="Test email button" value="Coming soon" tone="soon" detail="No existing safe System Admin test-email action exists, so no fake button is shown." />
          <StatusRow icon={MessageSquareOff} label="Automated WhatsApp sending" value="Not configured" tone="neutral" detail="Manual wa.me links exist; WhatsApp Cloud API sending is not enabled." />
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
        <SectionHeader icon={ExternalLink} title="Communication operations" description="Open the real areas that already own communication activity." />
        <div className="mt-5 grid gap-3">
          <AdminLink href="/platform/audit-center?eventType=Message%20Actions" label="View message audit" description="Investigate message preparation and manual-send audit events." />
          <AdminLink href="/platform/launch-readiness" label="Check message readiness" description="Review prepared-message counts in launch readiness." />
          <ReadOnlyCallout title="Messages section" description="A System Admin message center route is not configured yet. Business message handling remains business-workspace scoped." />
        </div>
      </section>
    </div>
  );
}

function RestrictionsTab({ demoModeEnabled }: { demoModeEnabled: boolean }) {
  return (
    <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader
          icon={FlaskConical}
          title="Action Restrictions"
          description="Real safety control backed by platform settings. It blocks selected external communications and payment recording flows."
        />
        <form action={toggleDemoModeAction}>
          <CsrfInput scope="platform:settings" />
          <input type="hidden" name="enabled" value={demoModeEnabled ? "false" : "true"} />
          <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#F97316] px-4 text-sm font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
            {demoModeEnabled ? "Disable Restrictions" : "Enable Restrictions"}
          </button>
        </form>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Restriction Status</p>
          <div className="mt-3">
            <StatusBadge label={demoModeEnabled ? "Enabled" : "Disabled"} tone={demoModeEnabled ? "warning" : "neutral"} />
          </div>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            This is the only writable control on this page because it is backed by an existing server action and audit log.
          </p>
        </div>

        <StatusPanel
          title="What is blocked"
          rows={[
            ["Email sending", "Blocked when restrictions are enabled"],
            ["SMS", "Blocked when restrictions are enabled"],
            ["WhatsApp", "Blocked when restrictions are enabled"],
            ["Invoice/payment recording", "Blocked when restrictions are enabled"],
            ["Campaign delivery", "Blocked when restrictions are enabled"],
          ]}
        />

        <StatusPanel
          title="Configured restriction catalog"
          rows={demoModeRestrictions.map((restriction) => [restriction.label, restriction.enabled ? "Enabled" : "Disabled"])}
        />
      </div>

      <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#C2410C]">
        Real customer communications remain paused while restrictions are active.
      </div>
    </section>
  );
}

function AuditLogsTab({ auditEvents }: { auditEvents: AuditEventRow[] }) {
  return (
    <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader icon={Activity} title="Audit Logs" description="Recent platform and business audit events, with links into the full audit workspace." />
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/platform/audit-center" icon={Search} label="View audit center" />
          <LinkButton href="/platform/audit-center/export?format=csv" icon={FileDown} label="Export CSV" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {auditEvents.map((event) => (
          <article key={event.id} className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">Audit event</p>
            <h3 className="mt-1 text-sm font-semibold text-[#111827]">{formatAction(event.action)}</h3>
            <div className="mt-4 grid gap-2 text-sm">
              <MobileDetailLine label="Entity" value={`${event.entityType}${event.entityId ? ` #${event.entityId}` : ""}`} />
              <MobileDetailLine label="Actor" value={event.actorUser?.name ?? event.actorUser?.email ?? "System"} />
              <MobileDetailLine label="Business" value={event.business?.name ?? "Platform"} />
              <MobileDetailLine label="Created" value={formatDateTime(event.createdAt)} />
            </div>
          </article>
        ))}
        {auditEvents.length === 0 ? <EmptyState message="No audit events recorded yet." /> : null}
      </div>

      <div className="mt-5 hidden max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-[#64748B]">
              {["Action", "Entity", "Actor", "Business", "Created At"].map((heading) => (
                <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditEvents.map((event) => (
              <tr key={event.id}>
                <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{formatAction(event.action)}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#64748B]">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#64748B]">{event.actorUser?.name ?? event.actorUser?.email ?? "System"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#64748B]">{event.business?.name ?? "Platform"}</td>
                <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#64748B]">{formatDateTime(event.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditEvents.length === 0 ? <EmptyState message="No audit events recorded yet." /> : null}
      </div>
    </section>
  );
}

function IntegrationsTab({ state }: { state: ReturnType<typeof buildStateType> }) {
  return (
    <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
      <SectionHeader icon={Server} title="Integrations" description="Connected or missing integration state derived from safe environment-variable presence checks." />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatusRow icon={Database} label="Database connected" value="Configured" tone="success" detail={`Current database: ${state.databaseName}. Connection is proven by loading this page.`} />
        <StatusRow icon={Mail} label="Resend configured" value={state.resendConfigured ? "Configured" : "Missing"} tone={state.resendConfigured ? "success" : "danger"} detail="Presence check only. RESEND_API_KEY value is never displayed." />
        <StatusRow icon={Mail} label="Password reset sender" value={state.passwordResetSenderConfigured ? "Configured" : "Missing"} tone={state.passwordResetSenderConfigured ? "success" : "danger"} detail="Presence check only. Sender address value is not displayed." />
        <StatusRow icon={Database} label="Storage configured" value={state.storageConfigured ? "Configured" : "Not configured"} tone={state.storageConfigured ? "success" : "neutral"} detail="Checks known storage environment keys without exposing values." />
        <StatusRow icon={Receipt} label="Payment provider configured" value={state.paymentProviderConfigured ? "Configured" : "Not configured"} tone={state.paymentProviderConfigured ? "success" : "neutral"} detail="Payment-provider keys are not required for current manual billing flows." />
        <StatusRow icon={Smartphone} label="External WhatsApp API" value="Not configured" tone="neutral" detail="Manual WhatsApp share links exist. Cloud API automation is not enabled." />
      </div>
    </section>
  );
}

function MaintenanceTab({ state }: { state: ReturnType<typeof buildStateType> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
        <SectionHeader icon={HeartPulse} title="Maintenance / Launch Readiness" description="Operational links for daily System Admin readiness checks." />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <AdminLink href="/platform/database" label="Database status" description="Open database and Prisma health checks." />
          <AdminLink href="/platform/launch-readiness" label="Launch Readiness" description="Review the launch checklist and readiness percentage." />
          <AdminLink href="/platform/health-analytics" label="Health Analytics" description="Inspect operational health and risk trends." />
          <AdminLink href="/platform/billing-center" label="Billing Center" description="Review subscriptions, payments, and commercial status." />
          <AdminLink href="/platform/operations-center" label="Operations Center" description="Manage support requests and active support sessions." />
          <AdminLink href="/platform/audit-center" label="Audit Center" description="Search operational and security audit history." />
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7E9EE] bg-white p-4 shadow-sm md:p-5">
        <SectionHeader icon={HeartPulse} title="Current state" description="Compact operational signals from this database." />
        <div className="mt-5 grid gap-3">
          <MiniMetric label="Environment" value={state.environmentName} />
          <MiniMetric label="Businesses" value={state.businesses.toString()} />
          <MiniMetric label="Users" value={state.users.toString()} />
          <MiniMetric label="Trial/Active Subscriptions" value={state.activeSubscriptions.toString()} />
          <MiniMetric label="Open Alerts" value={state.openAlerts.toString()} tone={state.openAlerts > 0 ? "warning" : "success"} />
        </div>
      </section>
    </div>
  );
}

function buildStateType() {
  return {
    databaseName: "",
    environmentName: "",
    demoModeEnabled: false,
    businesses: 0,
    users: 0,
    activeSubscriptions: 0,
    openAlerts: 0,
    preparedMessages: 0,
    sessionSecretConfigured: false,
    appUrlConfigured: false,
    resendConfigured: false,
    passwordResetSenderConfigured: false,
    storageConfigured: false,
    paymentProviderConfigured: false,
    whatsappSupportConfigured: false,
  };
}

function getDatabaseName() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return "Not Configured";

  try {
    return new URL(databaseUrl).pathname.replace("/", "") || "Unknown";
  } catch {
    return "Unknown";
  }
}

function getEnvironmentName(databaseName: string) {
  const configured = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV;
  if (configured) return toTitleCase(configured);
  if (databaseName === "loyalty_platform_pilot") return "Pilot";
  if (process.env.NODE_ENV === "production") return "Production";
  return "Development";
}

function normalizeTab(tab?: string): SettingsTab {
  if (tab === "general") return "security";
  if (tab === "notifications") return "communications";
  if (tab === "demo-mode") return "restrictions";
  return settingsTabs.some((item) => item.key === tab) ? (tab as SettingsTab) : "security";
}

function hasAnyEnv(keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]));
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatAction(action: string) {
  return action.replaceAll("_", " ");
}

function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 className="break-words text-lg font-black tracking-tight text-[#111827]">{title}</h2>
        <p className="mt-1 break-words text-sm leading-6 text-[#64748B]">{description}</p>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: StatusTone;
  detail: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#E7E9EE] bg-[#FAFAFA] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#F97316]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm font-bold text-[#111827]">{label}</p>
        </div>
        <StatusBadge label={value} tone={tone} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{detail}</p>
    </article>
  );
}

type StatusTone = "success" | "danger" | "warning" | "neutral" | "soon";

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700"
        : tone === "warning"
          ? "border-orange-200 bg-orange-50 text-[#C2410C]"
          : tone === "soon"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-[#E2E8F0] bg-white text-[#64748B]";

  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-black ${className}`}>{label}</span>;
}

function AdminLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-xl border border-[#E7E9EE] bg-white p-4 transition hover:border-[#F97316] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
      <div className="min-w-0">
        <p className="break-words font-bold text-[#111827] group-hover:text-[#EA580C]">{label}</p>
        <p className="mt-0.5 break-words text-sm leading-5 text-[#64748B]">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" aria-hidden="true" />
    </Link>
  );
}

function LinkButton({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

function StatusPanel({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <div className="mt-3 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
            <span className="min-w-0 break-words text-[#374151]">{label}</span>
            <span className="shrink-0 text-right font-semibold text-[#64748B]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyCallout({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
        <p className="text-sm font-black text-[#111827]">{title}</p>
        <StatusBadge label="Coming soon" tone="soon" />
      </div>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

function MiniMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: StatusTone }) {
  const valueClass = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-[#C2410C]" : "text-[#111827]";
  return (
    <div className="rounded-xl border border-[#E7E9EE] bg-[#FAFAFA] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className={`mt-2 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function MobileDetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-white px-3 py-2">
      <span className="shrink-0 text-[#64748B]">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-8 text-center text-sm font-semibold text-[#64748B]">
      {message}
    </div>
  );
}
