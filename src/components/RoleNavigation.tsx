"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  Database,
  History,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  QrCode,
  Receipt,
  Rocket,
  Settings,
  Share2,
  Sparkles,
  Store,
  ClipboardList,
  CircleDollarSign,
  Package,
  BarChart3,
  Layers3,
  Gift,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AuthUser } from "@/lib/session";

type RoleNavigationProps = {
  role: AuthUser["role"];
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  accent?: boolean;
};

const businessOwnerNavigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Daily overview" },
      { href: "/dashboard/customers", label: "Customers", icon: Users, description: "Search and manage" },
      { href: "/dashboard/scanner", label: "Scanner", icon: QrCode, description: "Scan customer QR", accent: true },
      { href: "/dashboard/activity", label: "Activity", icon: History, description: "Customer timeline" },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/dashboard/programs", label: "Programs", icon: Sparkles, description: "Loyalty setup" },
      { href: "/dashboard/referrals", label: "Referrals", icon: Share2, description: "Referral growth" },
      { href: "/dashboard/staff", label: "Staff", icon: UserPlus, description: "Team access" },
      { href: "/dashboard/branches", label: "Branches", icon: Building2, description: "Locations" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard, description: "Subscription" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, description: "Business settings" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/dashboard/notifications", label: "Alerts", icon: Bell, description: "Risk and alerts" },
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, description: "Prepared messages" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/profile", label: "Profile", icon: Store, description: "Account profile" },
    ],
  },
];

const mobilePrimaryItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/scanner", label: "Scanner", icon: QrCode, accent: true },
  { href: "/dashboard/activity", label: "Activity", icon: History },
];

const mobileMoreItems: NavigationItem[] = [
  { href: "/dashboard/programs", label: "Programs", icon: Sparkles },
  { href: "/dashboard/referrals", label: "Referrals", icon: Share2 },
  { href: "/dashboard/staff", label: "Staff", icon: UserPlus },
  { href: "/dashboard/branches", label: "Branches", icon: Building2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/notifications", label: "Alerts", icon: Bell },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: Store },
];

const platformMobilePrimaryItems: NavigationItem[] = [
  { href: "/platform", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/businesses", label: "Businesses", icon: Building2 },
  { href: "/platform/billing-center", label: "Billing", icon: CircleDollarSign },
  { href: "/platform/audit-center", label: "Audit", icon: ClipboardList },
];

const platformMobileMoreItems: NavigationItem[] = [
  { href: "/platform/plans", label: "Plans", icon: Package },
  { href: "/platform/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/platform/invoices", label: "Invoices", icon: Receipt },
  { href: "/platform/users", label: "Users", icon: Users },
  { href: "/platform/health-analytics", label: "Analytics", icon: BarChart3 },
  { href: "/platform/tenant-center", label: "Tenant Center", icon: Layers3 },
  { href: "/platform/settings", label: "Settings", icon: Settings },
  { href: "/platform/database", label: "Database", icon: Database },
  { href: "/platform/launch-readiness", label: "Launch Readiness", icon: Rocket },
];

const branchMobileItems: NavigationItem[] = [
  { href: "/branch/customers/new", label: "Enroll", icon: UserPlus },
  { href: "/branch/scanner", label: "Scanner", icon: QrCode, accent: true },
  { href: "/branch/programs", label: "Programs", icon: Gift },
];
const staffMobileItems: NavigationItem[] = [
  { href: "/staff/customers/new", label: "Enroll", icon: UserPlus },
  { href: "/staff/scanner", label: "Scanner", icon: QrCode, accent: true },
  { href: "/staff/programs", label: "Programs", icon: Gift },
];

export function RoleNavigation({ role }: RoleNavigationProps) {
  const pathname = usePathname();

  if (role !== "BUSINESS_OWNER") {
    return null;
  }

  return (
    <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start" aria-label="Business Owner navigation">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#F1F5F9] px-2 pb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 business-bg-soft text-[#F97316] business-text">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111827]">Business Workspace</p>
            <p className="text-xs font-medium text-[#64748B]">Daily operations</p>
          </div>
        </div>

        <nav className="mt-4 grid gap-5" aria-label="Business navigation">
          {businessOwnerNavigationGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">{group.label}</p>
              <div className="grid gap-1">
                {group.items.map((item) => (
                  item.accent ? (
                    <div key={item.href} className="my-2 border-y border-orange-100 business-border-soft py-2">
                      <NavigationLink item={item} pathname={pathname} />
                    </div>
                  ) : (
                    <NavigationLink key={item.href} item={item} pathname={pathname} />
                  )
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export function MobileBusinessNavigation({ role }: RoleNavigationProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (role !== "BUSINESS_OWNER") {
    return null;
  }

  const activeMoreItem = mobileMoreItems.find((item) => isActivePath(pathname, item.href));
  const moreActive = Boolean(activeMoreItem);

  return (
    <div className="lg:hidden">
      {moreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close more menu"
            className="fixed inset-0 z-30 bg-[#0F172A]/35 backdrop-blur-[1px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] rounded-t-3xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3">
              <p className="text-base font-bold text-[#111827]">More{activeMoreItem ? ` - ${activeMoreItem.label}` : ""}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm font-bold text-[#64748B] business-hover"
              >
                Close
              </button>
            </div>
            <div className="grid max-h-[calc(82vh-56px)] grid-cols-2 gap-2 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              {mobileMoreItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold ${
                      active
                        ? "border-orange-200 business-border-soft bg-orange-50 business-bg-soft text-[#EA580C] business-text-strong"
                        : "border-[#E5E7EB] bg-white text-[#475569] business-hover"
                    }`}
                  >
                    <item.icon className="h-5 w-5 text-[#F97316] business-text" aria-hidden="true" />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {moreActive && !moreOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
          <span className="max-w-[min(22rem,calc(100vw-2rem))] truncate rounded-full border border-orange-200 business-border-soft bg-white px-3 py-1.5 text-xs font-bold text-[#EA580C] business-text-strong shadow-lg">
            More - {activeMoreItem?.label}
          </span>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        aria-label="Mobile business navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobilePrimaryItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                  active || item.accent
                    ? "bg-[#F97316] business-button text-white shadow-sm"
                    : "text-[#64748B] business-hover"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
            aria-expanded={moreOpen}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
              moreOpen || moreActive ? "bg-orange-50 business-bg-soft text-[#EA580C] business-text-strong" : "text-[#64748B] business-hover"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="max-w-full truncate">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
export function MobilePlatformNavigation({ role }: RoleNavigationProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (role !== "PLATFORM_OWNER") {
    return null;
  }

  const activeMoreItem = platformMobileMoreItems.find((item) => isActivePath(pathname, item.href));
  const moreActive = Boolean(activeMoreItem);

  return (
    <div className="lg:hidden">
      {moreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close more menu"
            className="fixed inset-0 z-30 bg-[#0F172A]/35 backdrop-blur-[1px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] rounded-t-3xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3">
              <p className="text-base font-bold text-[#111827]">More{activeMoreItem ? ` - ${activeMoreItem.label}` : ""}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm font-bold text-[#64748B] hover:bg-orange-50 hover:text-[#F97316]"
              >
                Close
              </button>
            </div>
            <div className="grid max-h-[calc(82vh-56px)] grid-cols-2 gap-2 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              {platformMobileMoreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold ${
                    isActivePath(pathname, item.href)
                      ? "border-orange-200 bg-orange-50 text-[#EA580C]"
                      : "border-[#E5E7EB] bg-white text-[#475569]"
                  }`}
                >
                  <item.icon className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {moreActive && !moreOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
          <span className="max-w-[min(22rem,calc(100vw-2rem))] truncate rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-[#EA580C] shadow-lg">
            More - {activeMoreItem?.label}
          </span>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        aria-label="Mobile system administrator navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {platformMobilePrimaryItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                  active ? "bg-[#F97316] text-white shadow-sm" : "text-[#64748B] hover:bg-orange-50 hover:text-[#F97316]"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
            aria-expanded={moreOpen}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
              moreOpen || moreActive ? "bg-orange-50 text-[#EA580C]" : "text-[#64748B] hover:bg-orange-50 hover:text-[#F97316]"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

export function MobileBranchNavigation({ role }: RoleNavigationProps) {
  const pathname = usePathname();

  if (role !== "BRANCH_MANAGER") {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      aria-label="Mobile branch manager navigation"
    >
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
        {branchMobileItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                active
                  ? "bg-[#F97316] business-button text-white shadow-sm"
                  : item.accent
                    ? "border border-[#F97316] business-border bg-orange-50 business-bg-soft text-[#EA580C] business-text-strong shadow-sm"
                    : "text-[#64748B] business-hover"
              }`}
            >
              <item.icon className={item.accent ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
export function MobileStaffNavigation({ role }: RoleNavigationProps) {
  const pathname = usePathname();

  if (role !== "STAFF") {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      aria-label="Mobile staff navigation"
    >
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
        {staffMobileItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                active
                  ? "bg-[#F97316] business-button text-white shadow-sm"
                  : item.accent
                    ? "border border-[#F97316] business-border bg-orange-50 business-bg-soft text-[#EA580C] business-text-strong shadow-sm"
                    : "text-[#64748B] business-hover"
              }`}
            >
              <item.icon className={item.accent ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
function NavigationLink({
  item,
  pathname,
  compact = false,
}: {
  item: NavigationItem;
  pathname: string;
  compact?: boolean;
}) {
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg border px-3 transition ${
        item.accent ? "py-3" : compact ? "py-2" : "py-2.5"
      } ${
        active
          ? "border-orange-200 business-border-soft bg-orange-50 business-bg-soft text-[#EA580C] business-text-strong"
          : item.accent
            ? "border-[#F97316] business-border bg-[#FFF7ED] text-[#EA580C] business-text-strong shadow-sm business-hover business-bg-soft"
            : "border-transparent text-[#64748B] border-transparent text-[#64748B] business-hover"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg ${
          item.accent ? "h-11 w-11" : "h-9 w-9"
        } ${
          active || item.accent ? "bg-white text-[#F97316] business-text shadow-sm" : "bg-[#F8FAFC] text-[#94A3B8] group-hover:text-[#F97316]"
        }`}
      >
        <item.icon className={item.accent ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-bold ${item.accent ? "text-base" : "text-sm"}`}>{item.label}</span>
        {!compact && item.description ? <span className="block truncate text-xs font-medium opacity-75">{item.description}</span> : null}
      </span>
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/platform") {
    return pathname === href;
  }

  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
