import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  CircleDollarSign,
  FileText,
  Home,
  LayoutDashboard,
  Layers3,
  Package,
  Receipt,
  Settings,
  Store,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BusinessBrandingProvider } from "@/components/BusinessBrandingProvider";
import { CsrfInput } from "@/components/CsrfInput";
import { IdleSessionTimeout } from "@/components/IdleSessionTimeout";
import { MobileBranchNavigation, MobileBusinessNavigation, MobilePlatformNavigation, MobileStaffNavigation, RoleNavigation } from "@/components/RoleNavigation";
import { getOperationalBusinessBranding } from "@/lib/business-branding";
import { isDemoModeEnabled } from "@/lib/platform-settings";
import type { AuthUser } from "@/lib/session";
import { getDisplayUserName, roleHomePath, roleLabels } from "@/lib/roles";

type DashboardShellProps = {
  user: AuthUser;
  title: string;
  eyebrow: string;
  children: ReactNode;
  headerAside?: ReactNode;
  hideWelcomeMessage?: boolean;
};

const navItems = [
  { href: "/platform", label: "Platform", role: "PLATFORM_OWNER", icon: LayoutDashboard },
  { href: "/dashboard", label: "Business", role: "BUSINESS_OWNER", icon: Store },
  { href: "/branch", label: "Branch", role: "BRANCH_MANAGER", icon: Building2 },
  { href: "/staff", label: "Staff", role: "STAFF", icon: Users },
] as const;

const platformNavItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/platform", label: "Dashboard", icon: Home },
  { href: "/platform/businesses", label: "Businesses", icon: Building2 },
  { href: "/platform/plans", label: "Plans", icon: Package },
  { href: "/platform/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/platform/invoices", label: "Invoices", icon: Receipt },
  { href: "/platform/users", label: "Users", icon: Users },
  { href: "/platform/health-analytics", label: "Analytics", icon: BarChart3 },
  { href: "/platform/audit-center", label: "Audit Center", icon: ClipboardList },
  { href: "/platform/billing-center", label: "Billing Center", icon: CircleDollarSign },
  { href: "/platform/tenant-center", label: "Tenant Center", icon: Layers3 },
  { href: "/platform/settings", label: "Settings", icon: Settings },
];

export async function DashboardShell({ user, title, eyebrow, children, headerAside, hideWelcomeMessage = false }: DashboardShellProps) {
  const demoModeEnabled = await isDemoModeEnabled();
  const businessBranding = await getOperationalBusinessBranding(user);
  const displayName = getDisplayUserName(user);
  const hasSidebar = user.role === "PLATFORM_OWNER" || user.role === "BUSINESS_OWNER";
  const showDefaultAccountCard = !hideWelcomeMessage && user.role !== "BUSINESS_OWNER" && user.role !== "PLATFORM_OWNER";
  const headerPanel = headerAside ?? (showDefaultAccountCard ? (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 business-bg-soft text-[#F97316] business-text">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="truncate text-sm font-semibold text-[#111827]">Welcome back</p>
          <p className="text-xs font-semibold uppercase text-[#F97316] business-text">{roleLabels[user.role]}</p>
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
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white text-[#111827]">
      <IdleSessionTimeout />
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-2 px-4 py-2.5 sm:px-6 sm:py-4 lg:gap-4 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <Link href={roleHomePath[user.role]} className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F97316] text-xs font-bold text-white business-bg sm:h-9 sm:w-9 sm:text-sm">
                LB
              </span>
              <span className="text-sm font-semibold text-[#111827]">LoyaltyBase</span>
              {demoModeEnabled ? <span className="rounded-md bg-orange-50 business-bg-soft px-2 py-1 text-xs font-semibold text-[#F97316] business-text">Demo</span> : null}
            </Link>
            <form action="/logout" method="post">
              <CsrfInput scope="logout" />
              <button
                type="submit"
                className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-sm font-medium text-[#111827] transition business-hover sm:py-2"
              >
                Logout
              </button>
            </form>
          </div>
          {user.role !== "BUSINESS_OWNER" ? (
            <nav className="hidden gap-2 overflow-x-auto text-sm text-[#6B7280] sm:flex">
              {navItems.filter((item) => item.role === user.role).map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md border border-[#F97316] px-3 py-2 font-semibold text-[#F97316]">
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <MobileBusinessNavigation role={user.role} />
        <MobilePlatformNavigation role={user.role} />
        <MobileBranchNavigation role={user.role} />
        <MobileStaffNavigation role={user.role} />
      </header>

      <main
        className={`mx-auto grid w-full max-w-7xl min-w-0 gap-6 overflow-x-hidden px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 ${
          user.role === "BUSINESS_OWNER" || user.role === "PLATFORM_OWNER" || user.role === "BRANCH_MANAGER" || user.role === "STAFF" ? "pb-24 lg:pb-6" : ""
        }`}
      >
        {demoModeEnabled ? (
          <div className="min-w-0 break-words rounded-md border border-orange-200 business-border-soft bg-orange-50 business-bg-soft px-4 py-3 text-sm font-semibold text-[#C2410C] business-text-strong lg:col-span-2">
            Demo Mode Active - External communications and selected production actions are restricted.
          </div>
        ) : null}

        {user.role === "PLATFORM_OWNER" ? (
          <aside className="hidden rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:block lg:self-start">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Platform</p>
            <nav className="grid gap-1" aria-label="Platform navigation">
              {platformNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    title.toLowerCase().includes(item.label.toLowerCase()) ||
                    (item.href === "/platform" && (title.toLowerCase().includes("platform admin") || title.toLowerCase().includes("platform operations")))
                      ? "bg-orange-50 text-[#F97316]"
                      : "text-[#6B7280] hover:bg-orange-50 hover:text-[#F97316]"
                  }`}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        ) : null}

        {user.role === "BUSINESS_OWNER" ? <RoleNavigation role={user.role} /> : null}

        <div className={`flex min-w-0 max-w-full flex-col gap-8 overflow-x-hidden ${hasSidebar ? "" : "lg:col-span-2"}`}>
        <section className={`grid min-w-0 gap-5 lg:items-end ${headerPanel ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316] business-text">{eyebrow}</p>
            <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              {title}
            </h1>
            {!hideWelcomeMessage ? (
              <p className="mt-2 max-w-2xl text-base leading-7 text-[#6B7280]">
                Welcome, {displayName}. Use your workspace to manage the tools available to your role.
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
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#FAFAFA] px-3 py-2">
      <span className="text-xs font-medium uppercase text-[#6B7280]">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-[#111827]">{value}</span>
    </div>
  );
}
