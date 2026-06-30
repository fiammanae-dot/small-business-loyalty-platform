import { BarChart3, Gift, Plus, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  FilterBar,
  MetricCard,
  PageActions,
  PageIntro,
  ProgressBar,
  SearchBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { progressValue } from "@/lib/programs";
import { businessTypeLabels } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type ProgramSearchParams = {
  q?: string;
  status?: string;
  reward?: string;
  sort?: string;
  direction?: string;
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<ProgramSearchParams>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "";
  const reward = params.reward ?? "";
  const sort = params.sort ?? "created";
  const direction = params.direction === "asc" ? "asc" : "desc";

  const allPrograms = await prisma.loyaltyProgram.findMany({
    where: { businessId: user.businessId },
    include: {
      memberships: {
        include: {
          stampTransactions: { select: { quantity: true } },
          rewardRedemptions: { select: { id: true } },
        },
      },
      rewardRedemptions: { select: { id: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const programRows = allPrograms.map((program) => {
    const requiredStamps = Math.max(program.requiredStamps, 1);
    const memberCount = program._count.memberships;
    const rewardReadyCount = program.memberships.filter(
      (membership) => membership.status !== "COMPLETED" && progressValue(membership.earnedStamps, membership.bonusStamps) >= requiredStamps,
    ).length;
    const progressTotal = program.memberships.reduce(
      (sum, membership) => sum + Math.min(requiredStamps, progressValue(membership.earnedStamps, membership.bonusStamps)),
      0,
    );
    const completionRate = memberCount > 0 ? Math.round((progressTotal / (memberCount * requiredStamps)) * 100) : 0;
    const stampsIssued = program.memberships.reduce(
      (sum, membership) => sum + membership.stampTransactions.reduce((stampSum, stamp) => stampSum + stamp.quantity, 0),
      0,
    );
    const rewardsRedeemed = program.rewardRedemptions.length;
    const averageVisits = memberCount > 0 ? Math.round(stampsIssued / memberCount) : 0;

    return {
      program,
      requiredStamps,
      memberCount,
      rewardReadyCount,
      completionRate,
      stampsIssued,
      rewardsRedeemed,
      averageVisits,
    };
  });

  const programs = programRows
    .filter((row) => {
      const program = row.program;
      const matchesSearch =
        !query ||
        program.name.toLowerCase().includes(query) ||
        program.productOrServiceName.toLowerCase().includes(query) ||
        program.rewardName.toLowerCase().includes(query);
      const matchesStatus = !status || (status === "active" ? program.active : !program.active);
      const matchesReward = !reward || (reward === "ready" ? row.rewardReadyCount > 0 : row.rewardReadyCount === 0);
      return matchesSearch && matchesStatus && matchesReward;
    })
    .sort((a, b) => {
      const sortValue =
        sort === "name"
          ? a.program.name.localeCompare(b.program.name)
          : sort === "members"
            ? a.memberCount - b.memberCount
            : sort === "completion"
              ? a.completionRate - b.completionRate
              : sort === "rewards"
                ? a.rewardsRedeemed - b.rewardsRedeemed
                : a.program.createdAt.getTime() - b.program.createdAt.getTime();
      return direction === "asc" ? sortValue : -sortValue;
    });

  const activeCount = allPrograms.filter((program) => program.active).length;
  const totalMembers = programRows.reduce((total, row) => total + row.memberCount, 0);
  const rewardsRedeemed = programRows.reduce((total, row) => total + row.rewardsRedeemed, 0);
  const rewardReadyCount = programRows.reduce((total, row) => total + row.rewardReadyCount, 0);
  const averageCompletionRate = programRows.length > 0 ? Math.round(programRows.reduce((total, row) => total + row.completionRate, 0) / programRows.length) : 0;
  const filtered = Boolean(query || status || reward || sort !== "created" || direction !== "desc");

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Loyalty Programs" hideWelcomeMessage>
      <div className="grid gap-5">
        <PageIntro
          eyebrow="Programs"
          description="Manage your loyalty programs, rewards and customer participation."
          actions={
            <PageActions>
              <ButtonLink href="/dashboard/programs/new" variant="business" leftIcon={<Plus className="h-4 w-4" aria-hidden />}>
                Create Program
              </ButtonLink>
              <ButtonLink href="/dashboard/exports/programs" variant="outline">
                Export
              </ButtonLink>
              <ButtonLink href="/dashboard/activity?type=program" variant="outline">
                View Analytics
              </ButtonLink>
            </PageActions>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Program KPI cards">
          <MetricCard label="Active Programs" value={activeCount} icon={<Gift className="h-5 w-5" />} tone="business" href="/dashboard/programs?status=active" />
          <MetricCard label="Total Members" value={totalMembers} icon={<Users className="h-5 w-5" />} href="/dashboard/customers" />
          <MetricCard label="Rewards Redeemed" value={rewardsRedeemed} icon={<Trophy className="h-5 w-5" />} href="/dashboard/activity?type=reward" />
          <MetricCard label="Reward Ready Customers" value={rewardReadyCount} icon={<Gift className="h-5 w-5" />} tone="warning" href="/dashboard/customers?reward=ready" />
          <MetricCard label="Average Completion Rate" value={averageCompletionRate + "%"} icon={<BarChart3 className="h-5 w-5" />} />
        </section>

        <SectionCard title="Find programs" description="Search and filter programs by status, reward readiness, and performance.">
          <form className="grid gap-4">
            <SearchBar name="q" defaultValue={params.q ?? ""} label="Search" placeholder="Search program name..." />
            <FilterBar
              title="Program filters"
              actions={
                <>
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md business-button px-4 text-sm font-semibold text-white">
                    Apply
                  </button>
                  <ButtonLink href="/dashboard/programs" variant="outline">
                    Clear Filters
                  </ButtonLink>
                </>
              }
            >
              <FilterSelect name="status" label="Status" defaultValue={status} options={[{ value: "", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
              <FilterSelect name="reward" label="Reward Ready" defaultValue={reward} options={[{ value: "", label: "Any reward state" }, { value: "ready", label: "Has reward-ready customers" }, { value: "none", label: "No reward-ready customers" }]} />
              <FilterSelect name="sort" label="Sort" defaultValue={sort} options={[{ value: "created", label: "Newest" }, { value: "members", label: "Most active" }, { value: "completion", label: "Completion" }, { value: "rewards", label: "Rewards redeemed" }, { value: "name", label: "Program name" }]} />
              <FilterSelect name="direction" label="Direction" defaultValue={direction} options={[{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }]} />
            </FilterBar>
          </form>
        </SectionCard>

        <SectionCard
          title="Program Performance"
          description={programs.length + " program" + (programs.length === 1 ? "" : "s") + " shown. Cards summarize members, completion, rewards redeemed and average visits."}
        >
          {programs.length > 0 ? (
            <>
              <div className="grid gap-4 lg:hidden">
                {programs.map((row) => <ProgramCard key={row.program.id} row={row} />)}
              </div>

              <div className="hidden lg:block">
                <DataTable>
                  <DataTableHeader>
                    <tr>
                      <DataTableHeadCell>Program</DataTableHeadCell>
                      <DataTableHeadCell>Reward</DataTableHeadCell>
                      <DataTableHeadCell>Members</DataTableHeadCell>
                      <DataTableHeadCell>Completion</DataTableHeadCell>
                      <DataTableHeadCell>Rewards</DataTableHeadCell>
                      <DataTableHeadCell>Status</DataTableHeadCell>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {programs.map((row) => (
                      <tr key={row.program.id}>
                        <DataTableCell className="font-semibold text-[#0F172A]">
                          <Link
                            href={"/dashboard/programs/" + row.program.uuid}
                            className="inline-flex max-w-full rounded-sm font-semibold text-[#0F172A] underline-offset-4 transition hover:text-[var(--business-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
                          >
                            <span className="break-words">{row.program.name}</span>
                          </Link>
                          <div className="mt-1 text-xs font-normal text-[#64748B]">{businessTypeLabels[row.program.businessType]} - {row.program.productOrServiceName}</div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="font-medium text-[#0F172A]">{row.program.rewardName}</div>
                          <div className="mt-1 text-xs text-[#64748B]">{row.requiredStamps} visits required</div>
                        </DataTableCell>
                        <DataTableCell>{row.memberCount}</DataTableCell>
                        <DataTableCell className="min-w-44">
                          <ProgressBar value={row.completionRate} label={row.completionRate + "% average"} barClassName="business-button" />
                        </DataTableCell>
                        <DataTableCell>
                          <div>{row.rewardsRedeemed} redeemed</div>
                          <div className="mt-1 text-xs text-[#64748B]">{row.rewardReadyCount} ready</div>
                        </DataTableCell>
                        <DataTableCell><ProgramStatus active={row.program.active} rewardReadyCount={row.rewardReadyCount} /></DataTableCell>
                      </tr>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            </>
          ) : (
            <EmptyState
              title={filtered ? "No programs match these filters." : "Create your first loyalty program."}
              description={filtered ? "Clear the filters to see all loyalty programs." : "Set up a simple stamp program so customers can start earning progress."}
              action={<ButtonLink href={filtered ? "/dashboard/programs" : "/dashboard/programs/new"} variant="business">{filtered ? "Clear Filters" : "Create Program"}</ButtonLink>}
            />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

type ProgramRow = {
  program: {
    id: number;
    uuid: string;
    name: string;
    businessType: keyof typeof businessTypeLabels;
    productOrServiceName: string;
    rewardName: string;
    active: boolean;
    createdAt: Date;
  };
  requiredStamps: number;
  memberCount: number;
  rewardReadyCount: number;
  completionRate: number;
  stampsIssued: number;
  rewardsRedeemed: number;
  averageVisits: number;
};

function ProgramCard({ row }: { row: ProgramRow }) {
  return (
    <article className="rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#0F172A]">
            <Link
              href={"/dashboard/programs/" + row.program.uuid}
              className="inline-flex max-w-full rounded-sm underline-offset-4 transition hover:text-[var(--business-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
            >
              <span className="break-words">{row.program.name}</span>
            </Link>
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">{businessTypeLabels[row.program.businessType]} - {row.program.productOrServiceName}</p>
        </div>
        <ProgramStatus active={row.program.active} rewardReadyCount={row.rewardReadyCount} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-[#475569]">
        <InfoLine label="Reward" value={row.program.rewardName} />
        <InfoLine label="Members" value={row.memberCount.toString()} />
        <InfoLine label="Reward ready" value={row.rewardReadyCount.toString()} />
        <InfoLine label="Average visits" value={row.averageVisits.toString()} />
      </div>
      <div className="mt-4">
        <ProgressBar value={row.completionRate} label={row.completionRate + "% completion"} barClassName="business-button" />
      </div>
    </article>
  );
}

function ProgramStatus({ active, rewardReadyCount }: { active: boolean; rewardReadyCount: number }) {
  if (!active) return <StatusBadge tone="neutral">Inactive</StatusBadge>;
  if (rewardReadyCount > 0) return <StatusBadge tone="warning">Reward Ready</StatusBadge>;
  return <StatusBadge tone="success">Active</StatusBadge>;
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#1E293B]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-10 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none business-ring focus:ring-0">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold text-[#0F172A]">{value}</span>
    </div>
  );
}
