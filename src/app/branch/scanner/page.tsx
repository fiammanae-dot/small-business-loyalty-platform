import { CameraScanner } from "@/components/CameraScanner";
import { DashboardShell } from "@/components/DashboardShell";
import { requireRole } from "@/lib/session";

export default async function BranchScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("BRANCH_MANAGER");
  const qs = await searchParams;

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Scanner">
      {qs.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{qs.error}</p> : null}
      <CameraScanner backHref="/branch" />
    </DashboardShell>
  );
}
