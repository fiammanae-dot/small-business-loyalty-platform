import Link from "next/link";
import { CardShareActions } from "@/components/CardShareActions";
import { DashboardShell } from "@/components/DashboardShell";
import { getCardUrl } from "@/lib/customer-cards";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function StaffCustomerSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; success?: string }>;
}) {
  const user = await requireRole("STAFF");
  const params = await searchParams;
  const token = params.card ?? "";
  const membership =
    user.businessId && user.branchId && token
      ? await prisma.businessCustomerMembership.findFirst({
          where: {
            cardToken: token,
            businessId: user.businessId,
          },
          include: { business: true, globalCustomer: true },
        })
      : null;
  const cardUrl = membership ? await getCardUrl(membership.cardToken) : null;

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Customer enrolled" hideWelcomeMessage>
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-semibold text-emerald-800">{params.success ?? "Customer created and enrolled successfully."}</h2>
        {cardUrl && membership ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-white p-4">
            <p className="text-sm font-semibold text-[#111827]">Public card URL</p>
            <p className="mt-2 break-all text-sm text-[#6B7280]">{cardUrl}</p>
            <div className="mt-4">
              <CardShareActions
                cardUrl={cardUrl}
                businessName={membership.business.name}
                customerName={`${membership.globalCustomer.firstName} ${membership.globalCustomer.lastName ?? ""}`.trim()}
                recipientPhone={membership.globalCustomer.normalizedPhone}
                auditMembershipUuid={membership.uuid}
                showWallet={false}
              />
            </div>
            <a
              href={cardUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-md business-button px-4 py-2 text-sm font-semibold text-white"
            >
              Open card
            </a>
          </div>
        ) : null}
        <div className="mt-5 flex gap-3">
          <Link href="/staff/customers/new" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
            Enroll another customer
          </Link>
          <Link href="/staff" className="rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-[#111827]">
            Back to staff dashboard
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
