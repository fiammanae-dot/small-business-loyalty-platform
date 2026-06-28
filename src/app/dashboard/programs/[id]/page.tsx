import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CopyButton } from "@/components/CopyButton";
import { CsrfInput } from "@/components/CsrfInput";
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
  PageHeader,
  ProgressBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { getProgramJoinQrDataUrl, getProgramJoinUrl } from "@/lib/program-join";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { businessTypeLabels } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { toggleProgramAction } from "@/app/dashboard/programs/actions";

export default async function ProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  let program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      memberships: {
        include: {
          businessCustomerMembership: { include: { globalCustomer: true } },
          stampTransactions: { select: { quantity: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      rewardRedemptions: true,
    },
  });
  if (!program && /^\d+$/.test(id)) {
    program = await prisma.loyaltyProgram.findFirst({
      where: { id: Number(id), businessId: user.businessId },
      include: {
        memberships: {
          include: {
            businessCustomerMembership: { include: { globalCustomer: true } },
            stampTransactions: { select: { quantity: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        rewardRedemptions: true,
      },
    });
  }
  if (!program) return <NotFound user={user} />;

  const nextActive = !program.active;
  const safeRequiredStamps = Math.max(program.requiredStamps, 1);
  const enrolledCustomers = program.memberships.length;
  const activeCustomers = program.memberships.filter(
    (membership) => membership.status === "ACTIVE" && progressValue(membership.earnedStamps, membership.bonusStamps) < safeRequiredStamps,
  ).length;
  const rewardReadyCustomers = program.memberships.filter(
    (membership) => membership.status !== "COMPLETED" && progressValue(membership.earnedStamps, membership.bonusStamps) >= safeRequiredStamps,
  ).length;
  const redeemedRewards = program.rewardRedemptions.length;
  const progressTotal = program.memberships.reduce(
    (sum, membership) => sum + Math.min(safeRequiredStamps, progressValue(membership.earnedStamps, membership.bonusStamps)),
    0,
  );
  const averageCompletionRate = enrolledCustomers > 0 ? Math.min(100, Math.round((progressTotal / (enrolledCustomers * safeRequiredStamps)) * 100)) : 0;
  const bonusStampsIssued = program.memberships.reduce((sum, membership) => sum + membership.bonusStamps, 0);
  const earnedStamps = program.memberships.reduce((sum, membership) => sum + membership.earnedStamps, 0);
  const joinUrl = await getProgramJoinUrl(program.joinToken);
  const joinQrCode = await getProgramJoinQrDataUrl(program.joinToken);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title={program.name} hideWelcomeMessage>
      <div className="grid gap-5">
        {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
        <PageHeader
          eyebrow={businessTypeLabels[program.businessType]}
          title={program.name}
          description={program.description ?? "Review program configuration, customer participation and reward performance."}
          actions={
            <PageActions>
              <ButtonLink href="/dashboard/programs" variant="outline">Back to Programs</ButtonLink>
              <ButtonLink href={"/dashboard/programs/" + program.uuid + "/edit"} variant="business">Edit Program</ButtonLink>
              <form action={toggleProgramAction}>
                <CsrfInput scope="dashboard:programs" />
                <input type="hidden" name="programUuid" value={program.uuid} />
                <input type="hidden" name="active" value={nextActive.toString()} />
                {nextActive ? (
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#1E293B] transition hover:bg-[#F8FAFC]">
                    Enable Program
                  </button>
                ) : (
                  <ConfirmSubmitButton
                    message="Disable this loyalty program? Customers will no longer earn stamps for it."
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#1E293B] transition hover:bg-[#F8FAFC]"
                  >
                    Disable Program
                  </ConfirmSubmitButton>
                )}
              </form>
            </PageActions>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Program metrics">
          <MetricCard label="Members" value={enrolledCustomers} />
          <MetricCard label="Active Members" value={activeCustomers} tone="success" />
          <MetricCard label="Reward Ready" value={rewardReadyCustomers} tone="warning" href={"/dashboard/programs/" + program.uuid + "/customers"} />
          <MetricCard label="Rewards Redeemed" value={redeemedRewards} />
          <MetricCard label="Completion" value={averageCompletionRate + "%"} tone="business" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            <SectionCard title="Program Information" description="Core program setup and visibility.">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Product / Service" value={program.productOrServiceName} />
                <Info label="Status" value={program.active ? "Active" : "Inactive"} />
                <Info label="Created" value={formatDate(program.createdAt)} />
                <Info label="Program type" value={businessTypeLabels[program.businessType]} />
              </div>
            </SectionCard>

            <SectionCard title="Reward" description="Reward offer and redemption progress.">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Reward name" value={program.rewardName} />
                <Info label="Required visits" value={program.requiredStamps.toString()} />
                <Info label="Reward description" value={program.rewardDescription} wide />
              </div>
            </SectionCard>

            <SectionCard title="Qualification" description="Visits, bonuses and date rules used by this program.">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Starting bonus" value={program.startingBonusStamps.toString()} />
                <Info label="Referral reward" value={program.referralRewardBonusStamps + " bonus stamp" + (program.referralRewardBonusStamps === 1 ? "" : "s")} />
                <Info label="Start date" value={program.startDate ? formatDate(program.startDate) : "-"} />
                <Info label="End date" value={program.endDate ? formatDate(program.endDate) : "-"} />
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5">
            <SectionCard title="Program Join QR" description="Print or share this QR so customers can join this program themselves. No stamps are added during signup.">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center">
                  <img src={joinQrCode} alt={`${program.name} join QR code`} className="mx-auto h-52 w-52 rounded-xl bg-white p-2" />
                  <p className="mt-3 text-sm font-semibold text-[#0F172A]">Scan to join {program.name}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{business.name}</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Join link</p>
                  <p className="mt-2 break-all text-sm font-semibold text-[#0F172A]">{joinUrl}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <CopyButton value={joinUrl} label="Copy join link" copiedLabel="Join link copied." />
                  <ButtonLink href={joinUrl} variant="outline" target="_blank" rel="noopener noreferrer">
                    Open Join Page
                  </ButtonLink>
                  <ButtonLink href={"/dashboard/programs/" + program.uuid + "/join-poster"} variant="business">
                    Printable Poster
                  </ButtonLink>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Program Performance" description="Existing activity summarized from program memberships and redemptions.">
              <div className="grid gap-4">
                <ProgressBar value={averageCompletionRate} label={averageCompletionRate + "% average completion"} barClassName="business-button" />
                <Info label="Earned stamps" value={earnedStamps.toString()} />
                <Info label="Bonus stamps issued" value={bonusStampsIssued.toString()} />
                <Info label="Redeemed rewards" value={redeemedRewards.toString()} />
              </div>
            </SectionCard>

            <SectionCard title="Danger Zone" description="Disable this program when customers should no longer earn stamps for it.">
              <form action={toggleProgramAction}>
                <CsrfInput scope="dashboard:programs" />
                <input type="hidden" name="programUuid" value={program.uuid} />
                <input type="hidden" name="active" value={nextActive.toString()} />
                {nextActive ? (
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#1E293B] transition hover:bg-[#F8FAFC]">
                    Enable Program
                  </button>
                ) : (
                  <ConfirmSubmitButton
                    message="Disable this loyalty program? Customers will no longer earn stamps for it."
                    className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Disable Program
                  </ConfirmSubmitButton>
                )}
              </form>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="Members" description="Recent customer participation for this program." actions={<ButtonLink href={"/dashboard/programs/" + program.uuid + "/customers"} variant="outline">View Customers</ButtonLink>}>
          {program.memberships.length > 0 ? (
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHeadCell>Customer</DataTableHeadCell>
                  <DataTableHeadCell>Progress</DataTableHeadCell>
                  <DataTableHeadCell>Status</DataTableHeadCell>
                  <DataTableHeadCell>Last Visit</DataTableHeadCell>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {program.memberships.slice(0, 8).map((membership) => {
                  const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
                  const rewardReady = progress >= safeRequiredStamps && membership.status !== "COMPLETED";
                  return (
                    <tr key={membership.id}>
                      <DataTableCell className="font-semibold text-[#0F172A]">
                        {membership.businessCustomerMembership.globalCustomer.firstName} {membership.businessCustomerMembership.globalCustomer.lastName ?? ""}
                      </DataTableCell>
                      <DataTableCell className="min-w-48">
                        <ProgressBar value={progress} max={safeRequiredStamps} label={progress + " / " + safeRequiredStamps} barClassName="business-button" />
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge tone={rewardReady ? "warning" : membership.status === "ACTIVE" ? "success" : "neutral"}>
                          {programCustomerStatusLabel({ status: membership.status, earnedStamps: membership.earnedStamps, bonusStamps: membership.bonusStamps, requiredStamps: safeRequiredStamps })}
                        </StatusBadge>
                      </DataTableCell>
                      <DataTableCell>{membership.stampTransactions[0] ? formatDate(membership.stampTransactions[0].createdAt) : "-"}</DataTableCell>
                    </tr>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState title="No enrolled customers yet" description="Customers will appear here after they join this loyalty program." />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function NotFound({ user }: { user: Parameters<typeof DashboardShell>[0]["user"] }) {
  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Program not found" hideWelcomeMessage>
      <SectionCard>
        <EmptyState title="Program not found" description="This program may have been removed or it does not belong to your business." />
      </SectionCard>
    </DashboardShell>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={"rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 " + (wide ? "md:col-span-2" : "")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}
