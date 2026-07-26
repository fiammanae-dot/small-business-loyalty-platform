import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  FileText,
  LayoutDashboard,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";
import { BusinessBrandingProvider } from "@/components/BusinessBrandingProvider";
import { CsrfInput } from "@/components/CsrfInput";
import { IdleSessionTimeout } from "@/components/IdleSessionTimeout";
import { MobileBranchNavigation, MobileBusinessNavigation, MobilePlatformNavigation, MobileStaffNavigation, PlatformSidebarNav, RoleNavigation } from "@/components/RoleNavigation";
import { SupportActivityTracker } from "@/components/SupportActivityTracker";
import { SupportEndSessionButton } from "@/components/SupportEndSessionButton";
import { SupportModeBanner } from "@/components/SupportModeBanner";
import { endSupportSessionAction } from "@/app/platform/businesses/support-actions";
import { getOperationalBusinessBranding } from "@/lib/business-branding";
import { isDemoModeEnabled } from "@/lib/platform-settings";
import { getActiveSupportSessionForCurrentAdmin } from "@/lib/support-sessions";
import type { AuthUser } from "@/lib/session";
import { roleHomePath, roleLabels } from "@/lib/roles";

type SupportShellSession = {
  id: number;
  reason: string;
  startedAt: Date;
  expiresAt: Date;
  status: string;
  readOnly: boolean;
  business: { name: string; uuid: string };
  adminUser: { name: string | null; email: string };
  activities?: Array<{
    id: number;
    activityType: string;
    path: string | null;
    entityType: string | null;
    entityId: string | null;
    description: string;
    createdAt: Date;
  }>;
};

type DashboardShellProps = {
  user: AuthUser;
  title: string;
  eyebrow: string;
  children: ReactNode;
  headerAside?: ReactNode;
  hideWelcomeMessage?: boolean;
  supportSession?: SupportShellSession | null;
};

const navItems = [
  { href: "/platform", label: "Platform", role: "PLATFORM_OWNER", icon: LayoutDashboard },
  { href: "/dashboard", label: "Business", role: "BUSINESS_OWNER", icon: Store },
  { href: "/branch", label: "Branch", role: "BRANCH_MANAGER", icon: Building2 },
  { href: "/staff", label: "Staff", role: "STAFF", icon: Users },
] as const;

export async function DashboardShell({ user, title, eyebrow, children, headerAside, hideWelcomeMessage = false, supportSession }: DashboardShellProps) {
  await isDemoModeEnabled();
  const supportContext = supportSession === undefined && user.role === "BUSINESS_OWNER" ? await getActiveSupportSessionForCurrentAdmin() : null;
  const activeSupportSession = supportSession ?? supportContext?.supportSession ?? null;
  const businessBranding = await getOperationalBusinessBranding(user);
  const hasSidebar = user.role === "PLATFORM_OWNER" || user.role === "BUSINESS_OWNER";
  const showDefaultAccountCard = !hideWelcomeMessage && user.role !== "BUSINESS_OWNER" && user.role !== "PLATFORM_OWNER";
  const supportNavSession = activeSupportSession
    ? {
        businessName: activeSupportSession.business.name,
        startedAt: activeSupportSession.startedAt.toISOString(),
        expiresAt: activeSupportSession.expiresAt.toISOString(),
        readOnly: activeSupportSession.readOnly,
      }
    : undefined;
  const headerPanel = headerAside ?? (showDefaultAccountCard ? (
    <div className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FBEFE8] business-bg-soft business-primary">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="truncate text-sm font-bold text-[#171A21]">Welcome back</p>
          <p className="text-xs font-semibold business-primary-strong">{roleLabels[user.role]}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <ShellInfo label="Email" value={user.email} />
        <ShellInfo label="Last Login" value="Current session" />
        <ShellInfo label="Role" value={roleLabels[user.role]} />
      </div>
    </div>
  ) : null);

  return (
    <BusinessBrandingProvider branding={businessBranding}>
    <div className="min-h-screen max-w-full overflow-x-clip bg-[#F6F7F9] text-[#171A21]">
      <IdleSessionTimeout />
      {activeSupportSession ? <SupportActivityTracker supportSessionId={activeSupportSession.id} /> : null}
      <header className="border-b border-[#E7E9EE] bg-white">
        <div className="mx-auto flex max-w-screen-2xl min-w-0 flex-col gap-2 px-4 py-2.5 sm:px-6 sm:py-4 lg:gap-4 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <Link href={roleHomePath[user.role]} className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E86A33] text-xs font-bold text-white shadow-[0_2px_6px_rgba(232,106,51,0.35)] business-bg sm:h-9 sm:w-9 sm:text-sm">
                LC
              </span>
              <span className="text-sm font-bold tracking-tight text-[#171A21]">Loyalty Card UAE</span>
              {activeSupportSession ? (
                <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-black uppercase text-white">Support</span>
              ) : null}
            </Link>
            <form action="/logout" method="post">
              <CsrfInput scope="logout" />
              <button
                type="submit"
                className="rounded-lg border border-[#E7E9EE] bg-white px-3 py-1.5 text-sm font-semibold text-[#3D4352] transition business-hover sm:py-2"
              >
                Logout
              </button>
            </form>
          </div>
          {user.role !== "BUSINESS_OWNER" ? (
            <nav className="hidden gap-2 overflow-x-auto text-sm text-[#7A8091] sm:flex">
              {navItems.filter((item) => item.role === user.role).map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg border border-[#F4C7AE] business-border-soft bg-[#FBEFE8] business-bg-soft px-3 py-2 font-semibold business-primary-strong">
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <MobileBusinessNavigation role={user.role} supportSession={supportNavSession} />
        <MobilePlatformNavigation role={user.role} />
        <MobileBranchNavigation role={user.role} />
        <MobileStaffNavigation role={user.role} />
      </header>

      {activeSupportSession ? (
        <SupportModeBanner
          sessionId={activeSupportSession.id}
          businessName={activeSupportSession.business.name}
          adminName={activeSupportSession.adminUser.name ?? "System Administrator"}
          adminEmail={activeSupportSession.adminUser.email}
          reason={activeSupportSession.reason}
          startedAt={activeSupportSession.startedAt.toISOString()}
          expiresAt={activeSupportSession.expiresAt.toISOString()}
          readOnly={activeSupportSession.readOnly}
          status={activeSupportSession.status}
          activities={(activeSupportSession.activities ?? []).map((activity) => ({
            id: activity.id,
            activityType: activity.activityType,
            path: activity.path,
            entityType: activity.entityType,
            entityId: activity.entityId,
            description: activity.description,
            createdAt: activity.createdAt.toISOString(),
          }))}
          endSessionControl={(
            <form action={endSupportSessionAction}>
              <CsrfInput scope="platform:support-sessions" />
              <input type="hidden" name="supportSessionId" value={activeSupportSession.id} />
              <input type="hidden" name="businessUuid" value={activeSupportSession.business.uuid} />
              <SupportEndSessionButton />
            </form>
          )}
        />
      ) : null}

      <main
        className={`mx-auto grid w-full max-w-screen-2xl min-w-0 gap-6 overflow-x-clip px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 ${
          user.role === "BUSINESS_OWNER" || user.role === "PLATFORM_OWNER" || user.role === "BRANCH_MANAGER" || user.role === "STAFF" ? "pb-24 lg:pb-6" : ""
        }`}
      >
        {user.role === "PLATFORM_OWNER" ? (
          <aside className="hidden rounded-xl border border-[#E7E9EE] bg-white p-3 shadow-[0_1px_2px_rgba(15,18,25,0.04)] lg:sticky lg:top-6 lg:block lg:self-start">
            <p className="px-2 pb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9AA0AD]">Platform</p>
            <PlatformSidebarNav />
          </aside>
        ) : null}

        {user.role === "BUSINESS_OWNER" ? <RoleNavigation role={user.role} supportSession={supportNavSession} /> : null}

        <div className={`flex min-w-0 max-w-full flex-col gap-8 overflow-x-clip ${hasSidebar ? "" : "lg:col-span-2"}`}>
        <section className={`grid min-w-0 gap-5 lg:items-end ${headerPanel ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-[13px] font-semibold tracking-wide ${activeSupportSession ? "text-red-600" : "business-primary-strong"}`}>
                {activeSupportSession ? "Support Session" : eyebrow}
              </p>
              {activeSupportSession ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black uppercase text-white">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  Support
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-[#171A21] sm:text-3xl">
              {activeSupportSession ? "Support Session" : title}
            </h1>
            {activeSupportSession ? (
              <p className="mt-2 max-w-3xl break-words text-sm font-semibold text-[#7A8091]">
                Viewing: <span className="text-[#171A21]">{activeSupportSession.business.name}</span>
              </p>
            ) : null}
          </div>
          {headerPanel}
        </section>

        {children}
        </div>
      </main>
    </div>
    </BusinessBrandingProvider>
  );
}

function ShellInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F3F4F7] px-3 py-2">
      <span className="text-xs font-semibold text-[#7A8091]">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-[#171A21]">{value}</span>
    </div>
  );
}
