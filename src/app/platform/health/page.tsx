import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { PlatformKpiGrid } from "@/components/PlatformKpiGrid";
import { formatDateTime } from "@/lib/format";
import { getPlatformHealth } from "@/lib/platform-health";
import { requireRole } from "@/lib/session";

export default async function PlatformHealthPage() {
  const user = await requireRole("PLATFORM_OWNER");
  const health = await getPlatformHealth();

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Platform health">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <p className="text-sm text-[#6B7280]">
          Read-only operational status. Informational only - nothing here changes business data or configuration.
        </p>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Build info</h2>
        <PlatformKpiGrid className="mt-3 gap-4 md:grid-cols-3">
          <InfoTile label="App version" value={health.build.appVersion} />
          <InfoTile label="Git commit" value={health.build.gitCommit ?? "Not available in this environment"} />
          <InfoTile label="Deployment environment" value={health.build.environment} />
          <InfoTile label="Node runtime" value={health.build.nodeVersion} />
          <InfoTile label="Server started" value={formatDateTime(new Date(health.build.serverStartedAt))} />
        </PlatformKpiGrid>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Database</h2>
        <PlatformKpiGrid className="mt-3 gap-4 md:grid-cols-3">
          <StatusTile
            label="Database"
            value={health.database.databaseConnected ? "Connected" : "Not connected"}
            ok={health.database.databaseConnected}
          />
          <StatusTile
            label="Prisma"
            value={health.database.prismaConnected ? "Connected" : "Not connected"}
            ok={health.database.prismaConnected}
          />
          <InfoTile
            label="Latest migration"
            value={
              health.migration
                ? `${health.migration.name}${health.migration.appliedAt ? ` (${formatDateTime(new Date(health.migration.appliedAt))})` : ""}`
                : "Unable to read migration history"
            }
          />
        </PlatformKpiGrid>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Integrations</h2>
        <PlatformKpiGrid className="mt-3 gap-4 md:grid-cols-3">
          <StatusTile
            label="Google Wallet"
            value={health.googleWallet.configured ? "Configured" : "Not configured"}
            ok={health.googleWallet.configured}
          />
          <StatusTile
            label="Error monitoring (Sentry)"
            value={health.sentry.configured ? "Configured" : "Not configured"}
            ok={health.sentry.configured}
          />
          <StatusTile
            label="Environment variables"
            value={health.environmentValidation.ok ? "All required variables set" : `Missing: ${health.environmentValidation.missing.join(", ")}`}
            ok={health.environmentValidation.ok}
          />
        </PlatformKpiGrid>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Background jobs &amp; storage</h2>
        <PlatformKpiGrid className="mt-3 gap-4 md:grid-cols-2">
          <InfoTile label="Background jobs" value={health.backgroundJobs.note} />
          <InfoTile label="File storage" value={health.storage.note} />
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

function StatusTile({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-3 md:p-4">
      <p className="text-sm font-medium text-[#6B7280]">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
        <p className="text-sm font-semibold text-[#111827]">{value}</p>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-3 md:p-4">
      <p className="text-sm font-medium text-[#6B7280]">{label}</p>
      <p className="mt-3 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
