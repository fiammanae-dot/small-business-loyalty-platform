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
  MetricCard,
  PageActions,
  PageIntro,
  ProgressBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { progressValue } from "@/lib/programs";
import { normalizeTierConfig } from "@/lib/customer-tiers";
import { businessTypeLabels } from "@/lib/roles";
import { formatAed } from "@/lib/cashback";
import { prisma } from "@/lib/prisma";

type ProgramSearchParams = {
  q?: string;
  status?: string;
  reward?: string;
  sort?: string;
  direction?: string;
};

function FeatureStatusCard({ title, enabled, detail, href }: { title: string; enabled: boolean; detail: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-white p-4 transition hover:border-[var(--business-primary)] hover:shadow-sm">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#111827]">{title}</span>
        <span className="mt-0.5 block text-xs text-[#6B7280]">{detail}</span>
      </span>
      <StatusBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Off"}</StatusBadge>
    </Link>
  );
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<ProgramSearchParams>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  // Membership businesses sell prepaid sessions, not reward cards, so this page
  // drops reward-ready language and shows sessions instead.
  const membershipMode = Boolean(business.membershipSettings?.enabled);
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
      _count: { select: { memberships: true, membershipTreatments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const programRows = allPrograms.map((program) => {
    const requiredStamps = Math.max(program.requiredStamps, 1);
    const memberCount = program._count.memberships;
    // A prepaid membership has no reward to become "ready".
    const rewardReadyCount = program.isMembership
      ? 0
      : program.memberships.filter(
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
      isMembership: program.isMembership,
      priceLabel: program.priceAmount != null ? `AED ${Number(program.priceAmount).toLocaleString()}` : null,
      membershipTreatmentCount: program._count.membershipTreatments,
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
  const cashbackEnabled = Boolean(business.cashbackSettings?.enabled);
  const cashbackRate = business.cashbackSettings?.ratePercent != null ? business.cashbackSettings.ratePercent.toString() : "5";
  const tierConfigured = Boolean(business.tierSetting);
  const tierConfig = normalizeTierConfig(business.tierSetting);
  const cashbackName = business.cashbackSettings?.name?.trim() || "Cashback";
  const cashbackCurrency = business.cashbackSettings?.currency ?? "AED";
  // Live cashback performance for the program card.
  const [cashbackMembers, cashbackEarnAgg, cashbackSpendAgg, cashbackBalanceAgg] = await Promise.all([
    prisma.businessCustomerMembership.count({ where: { businessId: business.id, cashbackTransactions: { some: {} } } }),
    prisma.cashbackTransaction.aggregate({ where: { businessId: business.id, type: "EARN" }, _sum: { amount: true, billAmount: true } }),
    prisma.cashbackTransaction.aggregate({ where: { businessId: business.id, type: "SPEND" }, _sum: { amount: true } }),
    prisma.businessCustomerMembership.aggregate({ where: { businessId: business.id }, _sum: { cashbackBalance: true } }),
  ]);
  const cashbackSpendBase = Number(cashbackEarnAgg._sum.billAmount ?? 0);
  const cashbackGiven = Number(cashbackEarnAgg._sum.amount ?? 0);
  const cashbackRedeemed = Number(cashbackSpendAgg._sum.amount ?? 0);
  const cashbackOutstanding = Number(cashbackBalanceAgg._sum.cashbackBalance ?? 0);

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
          {membershipMode ? null : (
            <MetricCard label="Rewards Redeemed" value={rewardsRedeemed} icon={<Trophy className="h-5 w-5" />} href="/dashboard/activity?type=reward" />
          )}
          {membershipMode ? null : (
            <MetricCard label="Reward Ready Customers" value={rewardReadyCount} icon={<Gift className="h-5 w-5" />} tone="warning" href="/dashboard/customers?reward=ready" />
          )}
          <MetricCard label="Average Completion Rate" value={averageCompletionRate + "%"} icon={<BarChart3 className="h-5 w-5" />} />
        </section>

        <SectionCard title="Business-wide features" description="Tiers apply across all your customers and layer on top of your stamp and membership programs.">
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureStatusCard
              title="Tiers"
              enabled={tierConfigured}
              detail={tierConfigured ? "Silver " + tierConfig.silverVisitRequirement + " \u2022 Gold " + tierConfig.goldVisitRequirement + " \u2022 VIP " + tierConfig.vipVisitRequirement + " visits" : "Not set up yet"}
              href="/dashboard/programs/new?type=tier"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Program Performance"
          description={programs.length + " program" + (programs.length === 1 ? "" : "s") + " shown, plus your business-wide cashback program. Cards summarize members, completion and activity."}
        >
          <div className="grid gap-4 lg:hidden">
            <CashbackProgramCard
              name={cashbackName}
              enabled={cashbackEnabled}
              rate={cashbackRate}
              currency={cashbackCurrency}
              editHref="/dashboard/programs/new?type=cashback"
              members={cashbackMembers}
              spendBase={cashbackSpendBase}
              given={cashbackGiven}
              redeemed={cashbackRedeemed}
              outstanding={cashbackOutstanding}
            />
            {programs.map((row) => <ProgramCard key={row.program.id} row={row} />)}
          </div>

          <div className="hidden lg:block">
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHeadCell>Program</DataTableHeadCell>
                  <DataTableHeadCell>{membershipMode ? "Package" : "Reward"}</DataTableHeadCell>
                  <DataTableHeadCell>Members</DataTableHeadCell>
                  <DataTableHeadCell>Completion</DataTableHeadCell>
                  <DataTableHeadCell>{membershipMode ? "Visits" : "Rewards"}</DataTableHeadCell>
                  <DataTableHeadCell>Status</DataTableHeadCell>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                <CashbackTableRow
                  name={cashbackName}
                  enabled={cashbackEnabled}
                  rate={cashbackRate}
                  currency={cashbackCurrency}
                  editHref="/dashboard/programs/new?type=cashback"
                  members={cashbackMembers}
                  spendBase={cashbackSpendBase}
                  given={cashbackGiven}
                  redeemed={cashbackRedeemed}
                  outstanding={cashbackOutstanding}
                />
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
                          {row.isMembership ? <div className="mt-1 text-xs font-semibold business-primary-strong">Membership{row.priceLabel ? ` \u00b7 ${row.priceLabel}` : ""}</div> : null}
                        </DataTableCell>
                        <DataTableCell>
                          {row.isMembership ? (
                            <>
                              <div className="font-medium text-[#0F172A]">{row.requiredStamps} visits</div>
                              <div className="mt-1 text-xs text-[#64748B]">Prepaid package</div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium text-[#0F172A]">{row.program.rewardName}</div>
                              <div className="mt-1 text-xs text-[#64748B]">{row.requiredStamps} visits required</div>
                            </>
                          )}
                        </DataTableCell>
                        <DataTableCell>{row.memberCount}</DataTableCell>
                        <DataTableCell className="min-w-44">
                          <ProgressBar value={row.completionRate} label={row.completionRate + "% average"} barClassName="business-button" />
                        </DataTableCell>
                        <DataTableCell>
                          {row.isMembership ? (
                            <div>{row.stampsIssued} visits used</div>
                          ) : (
                            <>
                              <div>{row.rewardsRedeemed} redeemed</div>
                              <div className="mt-1 text-xs text-[#64748B]">{row.rewardReadyCount} ready</div>
                            </>
                          )}
                        </DataTableCell>
                        <DataTableCell><ProgramStatus active={row.program.active} rewardReadyCount={row.rewardReadyCount} /></DataTableCell>
                      </tr>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          {programs.length === 0 ? (
            <EmptyState
              title={filtered ? "No programs match these filters." : "Create your first loyalty program."}
              description={filtered ? "Clear the filters to see all loyalty programs." : "Set up a simple stamp program so customers can start earning progress."}
              action={<ButtonLink href={filtered ? "/dashboard/programs" : "/dashboard/programs/new"} variant="business">{filtered ? "Clear Filters" : "Create Program"}</ButtonLink>}
            />
          ) : null}
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
  isMembership: boolean;
  priceLabel: string | null;
  membershipTreatmentCount: number;
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
          {row.isMembership ? (
            <p className="mt-2 inline-block rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-semibold text-[#0F172A]">
              Membership{row.priceLabel ? ` \u00b7 ${row.priceLabel}` : ""}{row.membershipTreatmentCount > 0 ? ` \u00b7 ${row.membershipTreatmentCount} treatments` : ""}
            </p>
          ) : null}
        </div>
        <ProgramStatus active={row.program.active} rewardReadyCount={row.rewardReadyCount} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-[#475569]">
        {row.isMembership ? (
          <>
            <InfoLine label="Package size" value={`${row.requiredStamps} visits`} />
            <InfoLine label="Members" value={row.memberCount.toString()} />
            <InfoLine label="Visits used" value={row.stampsIssued.toString()} />
            <InfoLine label="Average visits" value={row.averageVisits.toString()} />
          </>
        ) : (
          <>
            <InfoLine label="Reward" value={row.program.rewardName} />
            <InfoLine label="Members" value={row.memberCount.toString()} />
            <InfoLine label="Reward ready" value={row.rewardReadyCount.toString()} />
            <InfoLine label="Average visits" value={row.averageVisits.toString()} />
          </>
        )}
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

type CashbackCardProps = {
  name: string;
  enabled: boolean;
  rate: string;
  currency: string;
  editHref: string;
  members: number;
  spendBase: number;
  given: number;
  redeemed: number;
  outstanding: number;
};

// Mobile view: cashback rendered as a program card matching the other programs.
function CashbackProgramCard({ name, enabled, rate, currency, editHref, members, spendBase, given, redeemed, outstanding }: CashbackCardProps) {
  return (
    <article className="rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#0F172A]">
            <Link href="/dashboard/programs/cashback" className="inline-flex max-w-full rounded-sm underline-offset-4 transition hover:text-[var(--business-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2">
              <span className="break-words">{name}</span>
            </Link>
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">Cashback program &middot; applies to all customers</p>
          <p className="mt-2 inline-block rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-semibold text-[#0F172A]">Cashback &middot; {rate}% back</p>
        </div>
        <StatusBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Active" : "Off"}</StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-[#475569]">
        <InfoLine label="Cashback rate" value={`${rate}% of each payment`} />
        <InfoLine label="Members in cashback" value={members.toLocaleString()} />
        <InfoLine label="Spend earning cashback" value={formatAed(spendBase, currency)} />
        <InfoLine label="Cashback given" value={formatAed(given, currency)} />
        <InfoLine label="Redeemed" value={formatAed(redeemed, currency)} />
        <InfoLine label="Outstanding balance" value={formatAed(outstanding, currency)} />
      </div>
      <div className="mt-4">
        <ButtonLink href={editHref} variant="outline">Edit cashback card</ButtonLink>
      </div>
    </article>
  );
}

// Desktop view: cashback rendered as a row in the Program Performance table,
// mapping its figures onto the same columns the other programs use.
function CashbackTableRow({ name, enabled, rate, currency, members, spendBase, given, redeemed, outstanding }: CashbackCardProps) {
  return (
    <tr>
      <DataTableCell className="font-semibold text-[#0F172A]">
        <Link
          href="/dashboard/programs/cashback"
          className="inline-flex max-w-full rounded-sm font-semibold text-[#0F172A] underline-offset-4 transition hover:text-[var(--business-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"
        >
          <span className="break-words">{name}</span>
        </Link>
        <div className="mt-1 text-xs font-normal text-[#64748B]">Cashback program &middot; applies to all customers</div>
        <div className="mt-1 text-xs font-semibold business-primary-strong">Cashback &middot; {rate}% back</div>
      </DataTableCell>
      <DataTableCell>
        <div className="font-medium text-[#0F172A]">{rate}% of each payment</div>
        <div className="mt-1 text-xs text-[#64748B]">Business-wide</div>
      </DataTableCell>
      <DataTableCell>
        <div>{members.toLocaleString()}</div>
        <div className="mt-1 text-xs text-[#64748B]">{formatAed(spendBase, currency)} earning</div>
      </DataTableCell>
      <DataTableCell className="text-[#94A3B8]">&mdash;</DataTableCell>
      <DataTableCell>
        <div>{formatAed(given, currency)} given</div>
        <div className="mt-1 text-xs text-[#64748B]">{formatAed(redeemed, currency)} redeemed &middot; {formatAed(outstanding, currency)} outstanding</div>
      </DataTableCell>
      <DataTableCell><StatusBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Active" : "Off"}</StatusBadge></DataTableCell>
    </tr>
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
