import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const referrer = await prisma.businessCustomerMembership.findFirst({
    where: {
      referralCode: code,
      referralEnabled: true,
      status: "ACTIVE",
      business: { status: "ACTIVE" },
    },
    include: {
      business: { include: { branding: true } },
      globalCustomer: true,
    },
  });

  if (!referrer) {
    return <ReferralUnavailable />;
  }

  const brandColor = referrer.business.branding?.buttonColor ?? "#F97316";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8 text-[#111827]">
      <section className="w-full max-w-lg rounded-md border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md text-sm font-bold text-white" style={{ backgroundColor: brandColor }}>
            {referrer.business.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: brandColor }}>Loyalty referral</p>
            <h1 className="text-2xl font-semibold">{referrer.business.name}</h1>
            <p className="text-sm text-[#6B7280]">{businessTypeLabels[referrer.business.businessType]}</p>
          </div>
        </div>

        <div className="mt-6 rounded-md bg-orange-50 p-4">
          <p className="text-sm leading-6 text-[#111827]">
            Show this referral link to staff when joining the loyalty program. Staff will enroll you and connect the referral after your first stamp.
          </p>
          <p className="mt-3 text-sm text-[#6B7280]">
            Referral from {referrer.globalCustomer.firstName} {referrer.globalCustomer.lastName ?? ""}
          </p>
        </div>

        <div className="mt-5 rounded-md border border-[#E5E7EB] p-4">
          <p className="text-xs font-semibold uppercase text-[#6B7280]">Referral code</p>
          <p className="mt-2 break-all text-lg font-semibold text-[#111827]">{code}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href={`/staff/customers/new?ref=${encodeURIComponent(code)}`} className="rounded-md px-4 py-3 text-center text-sm font-semibold text-white" style={{ backgroundColor: brandColor }}>
            Staff enrollment
          </Link>
          <Link href={`/branch/customers/new?ref=${encodeURIComponent(code)}`} className="rounded-md border border-[#E5E7EB] px-4 py-3 text-center text-sm font-semibold text-[#111827]">
            Manager enrollment
          </Link>
        </div>
      </section>
    </main>
  );
}

function ReferralUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-md border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-orange-100 text-sm font-bold text-[#F97316]">
          LB
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Referral not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          This referral link is unavailable or has been disabled.
        </p>
      </section>
    </main>
  );
}
