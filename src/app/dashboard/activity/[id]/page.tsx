import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { customerProfileHref, staffProfileHref } from "@/lib/alert-investigation";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { roleLabels } from "@/lib/roles";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alert?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const transactionId = Number(id);
  if (!transactionId) notFound();

  const transaction = await prisma.stampTransaction.findFirst({
    where: { id: transactionId, businessId: user.businessId },
    include: {
      branch: true,
      issuedByUser: true,
      customerProgramMembership: {
        include: {
          loyaltyProgram: true,
          businessCustomerMembership: true,
        },
      },
    },
  });

  if (!transaction) notFound();

  const customerMembership = transaction.customerProgramMembership.businessCustomerMembership;
  const program = transaction.customerProgramMembership.loyaltyProgram;
  const progress = progressValue(
    transaction.customerProgramMembership.earnedStamps,
    transaction.customerProgramMembership.bonusStamps,
  );
  const customerHref = customerProfileHref(customerMembership.uuid, qs.alert ? Number(qs.alert) : undefined, transaction.id);
  const staffHref = staffProfileHref(transaction.issuedByUserId, qs.alert ? Number(qs.alert) : undefined, transaction.id);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Stamp activity">
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/notifications" className="text-sm font-semibold business-text">
          Back to notifications
        </Link>
        {customerHref ? <Link href={customerHref} className="text-sm font-semibold business-text">View customer</Link> : null}
        {staffHref ? <Link href={staffHref} className="text-sm font-semibold business-text">View staff</Link> : null}
      </div>

      <section className="rounded-md border-2 business-border bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold business-text">Highlighted alert activity</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Info label="Transaction ID" value={`#${transaction.id}`} />
          <Info label="Quantity issued" value={transaction.quantity.toString()} />
          <Info label="Source" value={transaction.source.replaceAll("_", " ")} />
          <Info label="Customer" value={`${customerMembership.firstName} ${customerMembership.lastName ?? ""}`.trim()} />
          <Info label="Program" value={program.name} />
          <Info label="Progress after activity" value={`${progress} / ${program.requiredStamps}`} />
          <Info label="Issued by" value={transaction.issuedByUser.name} />
          <Info label="Staff role" value={roleLabels[transaction.issuedByUser.role]} />
          <Info label="Branch" value={transaction.branch?.name ?? "-"} />
          <Info label="Created at" value={formatDateTime(transaction.createdAt)} />
          <Info label="Reason" value={transaction.reason ?? "-"} wide />
        </div>
      </section>
    </DashboardShell>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#E5E7EB] bg-white p-4 ${wide ? "md:col-span-3" : ""}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
