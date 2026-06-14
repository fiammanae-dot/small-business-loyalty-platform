import { DashboardShell } from "@/components/DashboardShell";
import { ProgramForm } from "@/components/ProgramForm";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createProgramAction } from "@/app/dashboard/programs/actions";

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Create program">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {params.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
        <ProgramForm
          action={createProgramAction}
          defaults={{ businessType: business.businessType, active: true }}
          submitLabel="Create Program"
        />
      </section>
    </DashboardShell>
  );
}
