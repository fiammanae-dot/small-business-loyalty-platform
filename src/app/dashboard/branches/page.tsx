import { DashboardShell } from "@/components/DashboardShell";
import { CsrfInput } from "@/components/CsrfInput";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { statusOptions } from "@/lib/platform-options";
import { saveBranchAction, toggleBranchStatusAction } from "@/app/dashboard/actions";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const plan = getCurrentPlan(business);
  const maxBranches = plan?.maxBranches ?? 1;
  const limitReached = business.branches.length >= maxBranches;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Branches">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Branch list</h2>
            <p className="text-sm text-[#6B7280]">
              Your current plan allows up to {maxBranches} branch(es).
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4">
          {business.branches.map((branch) => {
            const nextStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            return (
              <article key={branch.id} className="rounded-md border border-[#E5E7EB] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-semibold text-[#111827]">{branch.name}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">{branch.address}, {branch.city}, {branch.country}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">Created {formatDate(branch.createdAt)}</p>
                    <div className="mt-3"><StatusBadge status={branch.status} /></div>
                  </div>
                  <form action={toggleBranchStatusAction}>
                    <CsrfInput scope="dashboard:branches" />
                    <input type="hidden" name="branchId" value={branch.id} />
                    <input type="hidden" name="nextStatus" value={nextStatus} />
                    <button type="submit" className="text-sm font-semibold text-[#F97316]">
                      {nextStatus === "ACTIVE" ? "Enable" : "Disable"}
                    </button>
                  </form>
                </div>
                <form action={saveBranchAction} className="mt-5 grid gap-3 md:grid-cols-5">
                  <CsrfInput scope="dashboard:branches" />
                  <input type="hidden" name="branchId" value={branch.id} />
                  <Input name="name" label="Branch name" defaultValue={branch.name} />
                  <Input name="country" label="Country" defaultValue={branch.country} />
                  <Input name="city" label="City" defaultValue={branch.city} />
                  <Input name="address" label="Address" defaultValue={branch.address} />
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#111827]">Status</span>
                    <select name="status" defaultValue={branch.status} className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white md:col-start-5">
                    Save branch
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Add branch</h2>
        {limitReached ? (
          <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            Your current plan allows up to {maxBranches} branch(es).
          </p>
        ) : (
          <form action={saveBranchAction} className="mt-5 grid gap-4 md:grid-cols-5">
            <CsrfInput scope="dashboard:branches" />
            <Input name="name" label="Branch name" />
            <Input name="country" label="Country" />
            <Input name="city" label="City" />
            <Input name="address" label="Address" />
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Status</span>
              <select name="status" defaultValue="ACTIVE" className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="submit" className="h-11 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white md:col-start-5">
              Add branch
            </button>
          </form>
        )}
      </section>
    </DashboardShell>
  );
}

function Input({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} defaultValue={defaultValue} required className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}
