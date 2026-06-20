import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { checkDatabaseHealth } from "@/lib/database-health";
import { requireRole } from "@/lib/session";

export default async function DatabaseHealthPage() {
  const user = await requireRole("PLATFORM_OWNER");
  const health = await checkDatabaseHealth();

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Database health check">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <PlatformKpiGrid className="gap-4 md:grid-cols-3">
          <HealthTile
            label="Database"
            value={health.databaseConnected ? "Database Connected" : "Database Not Connected"}
            connected={health.databaseConnected}
          />
          <HealthTile
            label="Prisma"
            value={health.prismaConnected ? "Prisma Connected" : "Prisma Not Connected"}
            connected={health.prismaConnected}
          />
          <div className="rounded-md border border-[#E5E7EB] p-3 md:p-4">
            <p className="text-sm font-medium text-[#6B7280]">Last health check timestamp</p>
            <p className="mt-3 text-sm font-semibold text-[#111827]">{health.checkedAt}</p>
          </div>
        </PlatformKpiGrid>

        <div className="mt-6">
          <Link
            href="/platform"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
          >
            Back to platform
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}

function HealthTile({
  label,
  value,
  connected,
}: {
  label: string;
  value: string;
  connected: boolean;
}) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-3 md:p-4">
      <p className="text-sm font-medium text-[#6B7280]">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span
          className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-[#111827]">{value}</p>
      </div>
    </div>
  );
}
