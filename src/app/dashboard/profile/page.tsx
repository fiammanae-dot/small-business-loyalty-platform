import { DashboardShell } from "@/components/DashboardShell";
import { CsrfInput } from "@/components/CsrfInput";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { businessTypeOptions } from "@/lib/platform-options";
import { businessTypeLabels } from "@/lib/roles";
import { updateBusinessProfileAction } from "@/app/dashboard/actions";

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const plan = getCurrentPlan(business);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Business profile">
      <form action={updateBusinessProfileAction} className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <CsrfInput scope="dashboard:business-profile" />
        <Message error={params.error} success={params.success} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Business name</span>
            <input name="name" defaultValue={business.name} required className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Business type</span>
            <select name="businessType" defaultValue={business.businessType} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0">
              {businessTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <ReadOnly label="Status" value={<StatusBadge status={business.status} />} />
          <ReadOnly label="Subscription plan" value={plan?.name ?? "Unassigned"} />
          <ReadOnly label="Created date" value={formatDate(business.createdAt)} />
          <ReadOnly label="Current business type" value={businessTypeLabels[business.businessType]} />
        </div>
        <button type="submit" className="mt-6 h-10 rounded-md business-button px-4 text-sm font-semibold transition hover:brightness-95">
          Save profile
        </button>
      </form>
    </DashboardShell>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      {error ?? success}
    </p>
  );
}

function ReadOnly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
