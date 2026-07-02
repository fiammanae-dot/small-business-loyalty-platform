import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  PageActions,
  PageIntro,
  ProgressBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { progressValue, programCustomerStatusLabel, startingStampPolicyLabel } from "@/lib/programs";
import { prisma } from "@/lib/prisma";
import { enrollCustomerInProgramAction } from "@/app/dashboard/programs/actions";

export default async function ProgramCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      memberships: {
        include: {
          businessCustomerMembership: { include: { createdBranch: true } },
          stampTransactions: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });
  if (!program) {
    return (
      <DashboardShell user={user} eyebrow="Business Owner" title="Program not found" hideWelcomeMessage>
        <SectionCard>
          <EmptyState title="Program not found" description="This program may have been removed or it does not belong to your business." />
        </SectionCard>
      </DashboardShell>
    );
  }

  const availableCustomers = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId: user.businessId,
      status: "ACTIVE",
      programMemberships: { none: { loyaltyProgramId: program.id } },
    },
    include: { createdBranch: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title={program.name + " customers"} hideWelcomeMessage>
      <div className="grid gap-5">
        <PageIntro
          eyebrow="Program Customers"
          description="Review enrolled customers, loyalty progress, reward readiness and recent visits."
          actions={
            <PageActions>
              <ButtonLink href={"/dashboard/programs/" + program.uuid} variant="outline">Back to Program</ButtonLink>
              <ButtonLink href="/dashboard/scanner" variant="business">Open Scanner</ButtonLink>
            </PageActions>
          }
        />

        {qs.error || qs.success ? <p className={"rounded-md border px-3 py-2 text-sm " + (qs.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{qs.error ?? qs.success}</p> : null}

        <SectionCard title="Enroll customer" description={"Starting stamps: " + program.startingBonusStamps + " - Apply when: " + startingStampPolicyLabel(program.startingStampPolicy)}>
          <form action={enrollCustomerInProgramAction} className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <CsrfInput scope="dashboard:program-enrollment" />
            <input type="hidden" name="programUuid" value={program.uuid} />
            <SearchableCombobox
              label="Customer"
              name="membershipUuid"
              placeholder="Search eligible customers"
              emptyLabel="No eligible customers found."
              required
              options={availableCustomers.map((customer) => ({
                value: customer.uuid,
                label: (customer.firstName + " " + (customer.lastName ?? "")).trim(),
                description: customer.phone + (customer.email ? " - " + customer.email : ""),
                badge: customer.createdBranch?.name ?? "Business customer",
              }))}
            />
            <button type="submit" className="h-10 rounded-md business-button px-4 text-sm font-semibold text-white">
              Enroll Customer
            </button>
          </form>
        </SectionCard>

        <ProgramMembersTable program={program} />
      </div>
    </DashboardShell>
  );
}

type ProgramWithMembers = {
  requiredStamps: number;
  rewardName: string;
  memberships: Array<{
    id: number;
    earnedStamps: number;
    bonusStamps: number;
    status: string;
    enrolledAt: Date;
    stampTransactions: Array<{ createdAt: Date }>;
    businessCustomerMembership: {
      uuid: string;
      firstName: string;
      lastName: string | null;
      createdBranch: { name: string } | null;
    };
  }>;
};

function ProgramMembersTable({ program }: { program: ProgramWithMembers }) {
  return (
    <SectionCard title="Program customers" description="Customer participation, progress and reward readiness for this program.">
      {program.memberships.length > 0 ? (
        <>
          <div className="grid gap-4 lg:hidden">
            {program.memberships.map((membership) => <ProgramMemberCard key={membership.id} membership={membership} program={program} />)}
          </div>
          <div className="hidden lg:block">
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHeadCell>Customer</DataTableHeadCell>
                  <DataTableHeadCell>Progress</DataTableHeadCell>
                  <DataTableHeadCell>Reward Ready</DataTableHeadCell>
                  <DataTableHeadCell>Last Visit</DataTableHeadCell>
                  <DataTableHeadCell>Status</DataTableHeadCell>
                  <DataTableHeadCell className="text-right">Actions</DataTableHeadCell>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {program.memberships.map((membership) => {
                  const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
                  const rewardReady = progress >= program.requiredStamps && membership.status !== "COMPLETED";
                  return (
                    <tr key={membership.id}>
                      <DataTableCell className="font-semibold text-[#0F172A]">
                        <div>{membership.businessCustomerMembership.firstName} {membership.businessCustomerMembership.lastName ?? ""}</div>
                        <div className="mt-1 text-xs font-normal text-[#64748B]">{membership.businessCustomerMembership.createdBranch?.name ?? "Business customer"}</div>
                      </DataTableCell>
                      <DataTableCell className="min-w-48">
                        <ProgressBar value={progress} max={program.requiredStamps} label={progress + " / " + program.requiredStamps} barClassName="business-button" />
                      </DataTableCell>
                      <DataTableCell>{rewardReady ? <StatusBadge tone="warning">Reward Ready</StatusBadge> : <span className="text-[#64748B]">-</span>}</DataTableCell>
                      <DataTableCell>{membership.stampTransactions[0] ? formatDate(membership.stampTransactions[0].createdAt) : "-"}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge tone={rewardReady ? "warning" : membership.status === "ACTIVE" ? "success" : "neutral"}>
                          {programCustomerStatusLabel({ status: membership.status, earnedStamps: membership.earnedStamps, bonusStamps: membership.bonusStamps, requiredStamps: program.requiredStamps })}
                        </StatusBadge>
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <ButtonLink href={"/dashboard/customers/" + membership.businessCustomerMembership.uuid} variant="outline" size="sm">Open Customer</ButtonLink>
                      </DataTableCell>
                    </tr>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </div>
        </>
      ) : (
        <EmptyState title="No enrolled customers yet" description="Enroll an eligible customer to start tracking progress for this program." />
      )}
    </SectionCard>
  );
}

function ProgramMemberCard({ membership, program }: { membership: ProgramWithMembers["memberships"][number]; program: ProgramWithMembers }) {
  const progress = progressValue(membership.earnedStamps, membership.bonusStamps);
  const rewardReady = progress >= program.requiredStamps && membership.status !== "COMPLETED";
  return (
    <article className="rounded-md border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#0F172A]">{membership.businessCustomerMembership.firstName} {membership.businessCustomerMembership.lastName ?? ""}</h3>
          <p className="mt-1 text-sm text-[#64748B]">{membership.businessCustomerMembership.createdBranch?.name ?? "Business customer"}</p>
        </div>
        {rewardReady ? <StatusBadge tone="warning">Reward Ready</StatusBadge> : <StatusBadge tone="success">Active</StatusBadge>}
      </div>
      <div className="mt-4">
        <ProgressBar value={progress} max={program.requiredStamps} label={progress + " / " + program.requiredStamps} barClassName="business-button" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#64748B]">
        <span>Last visit</span>
        <span className="font-semibold text-[#0F172A]">{membership.stampTransactions[0] ? formatDate(membership.stampTransactions[0].createdAt) : "-"}</span>
      </div>
      <div className="mt-4 flex justify-end">
        <ButtonLink href={"/dashboard/customers/" + membership.businessCustomerMembership.uuid} variant="outline" size="sm">Open Customer</ButtonLink>
      </div>
    </article>
  );
}
