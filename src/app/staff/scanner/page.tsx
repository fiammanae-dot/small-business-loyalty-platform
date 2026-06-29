import { CameraScanner } from "@/components/CameraScanner";
import { DashboardShell } from "@/components/DashboardShell";
import { ScannerManualCustomerSearch } from "@/components/ScannerManualCustomerSearch";
import { ButtonLink, PageHeader } from "@/components/ui";
import { ScannerPageLayout } from "@/components/layouts";
import { requireRole } from "@/lib/session";

export default async function StaffScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customerSearch?: string }>;
}) {
  const user = await requireRole("STAFF");
  const qs = await searchParams;

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Scanner" hideWelcomeMessage>
      {qs.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{qs.error}</p> : null}
      <ScannerPageLayout
        scanner={
          <>
            <PageHeader
              title="Scanner"
              description="Scan a customer card, search manually, or process a referral."
              actions={<ButtonLink href="/staff" variant="outline">Back to Dashboard</ButtonLink>}
            />
            <CameraScanner />
          </>
        }
        lookup={user.businessId ? <ScannerManualCustomerSearch businessId={user.businessId} branchId={user.branchId} query={qs.customerSearch} actionPath="/staff/scanner" /> : null}
      />
    </DashboardShell>
  );
}
