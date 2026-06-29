import { CameraScanner } from "@/components/CameraScanner";
import { DashboardShell } from "@/components/DashboardShell";
import { ScannerManualCustomerSearch } from "@/components/ScannerManualCustomerSearch";
import { ButtonLink, PageHeader } from "@/components/ui";
import { ScannerPageLayout } from "@/components/layouts";
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
      <ScannerPageLayout
        scanner={
          <>
            <PageHeader
              title="Scanner"
              description="Scan a customer card, search manually, or process a referral."
              actions={<ButtonLink href="/dashboard" variant="outline">Back to Dashboard</ButtonLink>}
            />
            <CameraScanner />
          </>
        }
        lookup={user.businessId ? <ScannerManualCustomerSearch businessId={user.businessId} query={qs.customerSearch} actionPath="/dashboard/scanner" /> : null}
      />
    </DashboardShell>
  );
}
