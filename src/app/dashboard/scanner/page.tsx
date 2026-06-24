import { CameraScanner } from "@/components/CameraScanner";
import { DashboardShell } from "@/components/DashboardShell";
import { ScannerManualCustomerSearch } from "@/components/ScannerManualCustomerSearch";
import { requireRole } from "@/lib/session";

export default async function BusinessOwnerScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ customerSearch?: string }>;
}) {
  const user = await requireRole("BUSINESS_OWNER");
  const qs = await searchParams;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Scanner">
      <CameraScanner backHref="/dashboard" />
      {user.businessId ? <ScannerManualCustomerSearch businessId={user.businessId} query={qs.customerSearch} actionPath="/dashboard/scanner" /> : null}
    </DashboardShell>
  );
}
