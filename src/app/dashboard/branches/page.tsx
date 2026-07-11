import type { RecordStatus } from "@prisma/client";
import { Building2, CircleCheck, MapPin, Plus, TicketCheck, Users } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DashboardShell } from "@/components/DashboardShell";
import { CsrfInput } from "@/components/CsrfInput";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard, RequiredMark } from "@/components/ui";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { statusOptions } from "@/lib/platform-options";
import { prisma } from "@/lib/prisma";
import { saveBranchAction, toggleBranchStatusAction } from "@/app/dashboard/actions";

type BranchStats = { users: number; createdCustomerMemberships: number; stampTransactions: number };

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const plan = getCurrentPlan(business);
  const maxBranches = plan?.maxBranches ?? 1;
  const used = business.branches.length;
  const remaining = Math.max(0, maxBranches - used);
  const limitReached = used >= maxBranches;
  const planPercent = maxBranches > 0 ? Math.min(100, Math.round((used / maxBranches) * 100)) : 0;

  const branchStats = await prisma.branch.findMany({
    where: { businessId: user.businessId },
    select: {
      id: true,
      _count: { select: { users: true, createdCustomerMemberships: true, stampTransactions: true } },
    },
  });
  const statsById = new Map<number, BranchStats>(branchStats.map((branch) => [branch.id, branch._count]));

  const activeBranches = business.branches.filter((branch) => branch.status === "ACTIVE").length;
  const totalStaff = branchStats.reduce((sum, branch) => sum + branch._count.users, 0);
  const totalStamps = branchStats.reduce((sum, branch) => sum + branch._count.stampTransactions, 0);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Branches">
      <Message error={params.error} success={params.success} />

      <section className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-[#171A21]">Branch network</h2>
          <p className="mt-0.5 text-[13px] text-[#7A8091]">Manage your business locations, staff coverage, and activity.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Branches" value={used.toLocaleString()} helper={`of ${maxBranches} on your plan`} icon={<Building2 className="h-5 w-5 business-text" aria-hidden />} />
          <MetricCard label="Active" value={activeBranches.toLocaleString()} helper={`${used - activeBranches} inactive`} icon={<CircleCheck className="h-5 w-5 business-text" aria-hidden />} tone={activeBranches > 0 ? "success" : "neutral"} />
          <MetricCard label="Staff" value={totalStaff.toLocaleString()} helper="Across all branches" icon={<Users className="h-5 w-5 business-text" aria-hidden />} />
          <MetricCard label="Stamps issued" value={totalStamps.toLocaleString()} helper="All time" icon={<TicketCheck className="h-5 w-5 business-text" aria-hidden />} />
        </div>
        <div className="mt-4 rounded-lg bg-[#F8FAFC] px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Plan usage</span>
            <span className="font-semibold text-[#111827]">{used} of {maxBranches} branches used</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EAEDF0]">
            <div className="h-full rounded-full business-button" style={{ width: `${planPercent}%` }} />
          </div>
        </div>
      </section>

      <details className="group min-w-0 overflow-hidden rounded-xl border border-[#E7E9EE] bg-white shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full business-bg-soft business-text"><Plus className="h-4 w-4" aria-hidden /></span>
            Add branch
          </span>
          <span className="text-xs text-[#9CA3AF]">{remaining} remaining on your plan</span>
        </summary>
        <div className="border-t border-[#E7E9EE] p-4">
          {limitReached ? (
            <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
              Your current plan allows up to {maxBranches} branch(es). Upgrade your plan to add more locations.
            </p>
          ) : (
            <BranchForm submitLabel="Add branch" />
          )}
        </div>
      </details>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {business.branches.map((branch) => {
          const nextStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
          const stats = statsById.get(branch.id) ?? { users: 0, createdCustomerMemberships: 0, stampTransactions: 0 };
          const isActive = branch.status === "ACTIVE";
          return (
            <article key={branch.id} className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isActive ? "business-bg-soft business-text" : "bg-[#F1EFE8] text-[#5F5E5A]"}`}>
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-[#111827]">{branch.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#9CA3AF]">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {branch.address}, {branch.city}, {branch.country}
                    </p>
                  </div>
                </div>
                <StatusBadge status={branch.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat value={stats.users} label="Staff" />
                <Stat value={stats.createdCustomerMemberships} label="Customers" />
                <Stat value={stats.stampTransactions} label="Stamps" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F1F3F5] pt-3">
                <span className="text-xs text-[#9CA3AF]">Created {formatDate(branch.createdAt)}</span>
                <form action={toggleBranchStatusAction}>
                  <CsrfInput scope="dashboard:branches" />
                  <input type="hidden" name="branchId" value={branch.id} />
                  <input type="hidden" name="nextStatus" value={nextStatus} />
                  {nextStatus === "ACTIVE" ? (
                    <button type="submit" className="text-sm font-semibold text-emerald-600">
                      Enable
                    </button>
                  ) : (
                    <ConfirmSubmitButton
                      message="Disable this branch? Branch staff and scanner activity may be restricted."
                      className="text-sm font-semibold text-[#6B7280]"
                    >
                      Disable
                    </ConfirmSubmitButton>
                  )}
                </form>
              </div>

              <details className="mt-2 [&::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none text-sm font-semibold business-text">Edit branch details</summary>
                <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                  <BranchForm
                    branchId={branch.id}
                    name={branch.name}
                    country={branch.country}
                    city={branch.city}
                    address={branch.address}
                    status={branch.status}
                    submitLabel="Save branch"
                  />
                </div>
              </details>
            </article>
          );
        })}
        {business.branches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E5E7EB] p-6 text-sm text-[#6B7280] lg:col-span-2">
            No branches yet. Use Add branch above to create your first location.
          </p>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-[#FAFBFC] px-2 py-2.5 text-center">
      <p className="text-base font-semibold tabular-nums text-[#111827]">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{label}</p>
    </div>
  );
}

function BranchForm({
  branchId,
  name,
  country,
  city,
  address,
  status = "ACTIVE",
  submitLabel,
}: {
  branchId?: number;
  name?: string;
  country?: string;
  city?: string;
  address?: string;
  status?: RecordStatus;
  submitLabel: string;
}) {
  return (
    <form action={saveBranchAction} className="grid gap-3 md:grid-cols-5">
      <CsrfInput scope="dashboard:branches" />
      {branchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
      <Input name="name" label="Branch name" defaultValue={name} />
      <Input name="country" label="Country" defaultValue={country} />
      <Input name="city" label="City" defaultValue={city} />
      <Input name="address" label="Address" defaultValue={address} />
      <label className="space-y-2">
        <span className="text-sm font-medium text-[#111827]">Status</span>
        <select name="status" defaultValue={status} className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="submit" className="h-10 rounded-md business-button px-4 text-sm font-semibold text-white md:col-start-5">
        {submitLabel}
      </button>
    </form>
  );
}

function Input({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">
        {label}
        <RequiredMark />
      </span>
      <input name={name} defaultValue={defaultValue} required className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}
