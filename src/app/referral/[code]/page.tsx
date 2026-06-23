import { CopyReferralCodeButton } from "@/components/CopyReferralCodeButton";
import { businessTypeLabels } from "@/lib/roles";
import { extractReferralCode, resolveReferralLandingReferrer } from "@/lib/referrals";

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const referralCode = extractReferralCode(code);

  if (!referralCode) {
    return <ReferralUnavailable />;
  }

  const referrer = await resolveReferralLandingReferrer(referralCode);

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

        <div className="mt-6 rounded-md p-4" style={{ backgroundColor: `${brandColor}14` }}>
          <p className="text-xs font-semibold uppercase text-[#6B7280]">Referred by</p>
          <p className="mt-2 text-lg font-semibold text-[#111827]">
            {referrer.globalCustomer.firstName} {referrer.globalCustomer.lastName ?? ""}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#111827]">
            Show this referral code to staff when joining the loyalty program.
          </p>
        </div>

        <div className="mt-5 rounded-md border border-[#E5E7EB] p-4">
          <p className="text-xs font-semibold uppercase text-[#6B7280]">Referral code</p>
          <p className="mt-2 break-all text-lg font-semibold text-[#111827]">{referralCode}</p>
        </div>

        <CopyReferralCodeButton referralCode={referralCode} brandColor={brandColor} />
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
