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
import { CsrfInput } from "@/components/CsrfInput";
import { IdleSessionTimeout } from "@/components/IdleSessionTimeout";
import { MobileBusinessNavigation, RoleNavigation } from "@/components/RoleNavigation";
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
  const displayName = getDisplayUserName(user);
  const hasSidebar = user.role === "PLATFORM_OWNER" || user.role === "BUSINESS_OWNER";

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <IdleSessionTimeout />
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href={roleHomePath[user.role]} className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
                LB
              </span>
              <span className="text-sm font-semibold text-[#111827]">LoyaltyBase</span>
              {demoModeEnabled ? <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-[#F97316]">Demo</span> : null}
            </Link>
            <form action="/logout" method="post">
              <CsrfInput scope="logout" />
              <button
                type="submit"
                className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
              >
                Logout
              </button>
            </form>
          </div>
          {user.role !== "BUSINESS_OWNER" ? (
            <nav className="flex gap-2 overflow-x-auto text-sm text-[#6B7280]">
              {navItems.filter((item) => item.role === user.role).map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md border border-[#F97316] px-3 py-2 font-semibold text-[#F97316]">
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <MobileBusinessNavigation role={user.role} />
      </header>

      <main
        className={`mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 ${
          user.role === "BUSINESS_OWNER" ? "pb-24 lg:pb-6" : ""
        }`}
      >
        {demoModeEnabled ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#C2410C] lg:col-span-2">
            Demo Mode Active — External communications and selected production actions are restricted.
          </div>
        ) : null}

        {user.role === "PLATFORM_OWNER" ? (
          <aside className="rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:self-start">
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

        <div className={`flex flex-col gap-8 ${hasSidebar ? "" : "lg:col-span-2"}`}>
        <section className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              {title}
            </h1>
            {!hideWelcomeMessage ? (
              <p className="mt-2 max-w-2xl text-base leading-7 text-[#6B7280]">
                Welcome, {displayName}. Use your workspace to manage the tools available to your role.
              </p>
            ) : null}
          </div>
          {headerAside ?? (hideWelcomeMessage || user.role === "BUSINESS_OWNER" ? null : (
          <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">Welcome back</p>
                <p className="text-xs font-semibold uppercase text-[#F97316]">{roleLabels[user.role]}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <ShellInfo label="Email" value={user.email} />
              <ShellInfo label="Last Login" value="Current session" />
              <ShellInfo label="Role" value={roleLabels[user.role]} />
            </div>
          </div>
          ))}
        </section>

        {children}
        </div>
      </main>
    </div>
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
