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
          <details className="group">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
              Add branch
            </summary>
            <div className="absolute right-6 z-20 mt-2 w-[min(920px,calc(100vw-3rem))] rounded-md border border-[#E5E7EB] bg-white p-4 shadow-xl">
              {limitReached ? (
                <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  Your current plan allows up to {maxBranches} branch(es).
                </p>
              ) : (
                <BranchForm submitLabel="Add branch" />
              )}
            </div>
          </details>
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
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#F97316]">Edit branch details</summary>
                  <div className="mt-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
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
            <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No branches yet. Use Add branch to create your first location.</p>
          ) : null}
        </div>
      </section>
    </DashboardShell>
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
  status?: "ACTIVE" | "INACTIVE";
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
      <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white md:col-start-5">
        {submitLabel}
      </button>
    </form>
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
