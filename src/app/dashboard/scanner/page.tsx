import { CameraScanner } from "@/components/CameraScanner";
import { DashboardShell } from "@/components/DashboardShell";
import { requireRole } from "@/lib/session";

export default async function BusinessOwnerScannerPage() {
  const user = await requireRole("BUSINESS_OWNER");

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Scanner">
      <CameraScanner backHref="/dashboard" />
    </DashboardShell>
  );
}
