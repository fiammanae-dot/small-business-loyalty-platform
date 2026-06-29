import { StatusBadge } from "@/components/StatusBadge";
import { maskPhoneNumber } from "@/lib/customer-cards";
import { fromStoredTier } from "@/lib/customer-tiers";
import { lookupActiveReferralReferrers, type ReferralReferrerLookupMatch } from "@/lib/referrals";

export async function ReferralReferrerLookupPreview({
  businessId,
  query,
  selectedReferralCode,
}: {
  businessId: number;
  query?: string;
  selectedReferralCode?: string;
}) {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) return null;

  const lookup = await lookupActiveReferralReferrers({ businessId, query: trimmedQuery });

  if (lookup.status === "NOT_FOUND") {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        No matching referrer found.
      </p>
    );
  }

  if (lookup.status === "FOUND" && lookup.matches[0]) {
    return <ConfirmedReferrerCard referrer={lookup.matches[0]} />;
  }

  if (lookup.status === "MULTIPLE") {
    return (
      <div className="rounded-md border border-[#E5E7EB] bg-white p-3 text-sm">
        <p className="font-semibold text-[#111827]">Choose the matching referrer</p>
        <div className="mt-3 grid gap-2">
          {lookup.matches.map((match) => (
            <label key={match.id} className="flex gap-3 rounded-md border border-[#E5E7EB] p-3 hover:bg-[#F8FAFC]">
              <input
                type="radio"
                name="referralCode"
                value={match.referralCode}
                defaultChecked={selectedReferralCode === match.referralCode}
                required
                className="mt-1 h-4 w-4"
              />
              <ReferrerSummary referrer={match} />
            </label>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function ConfirmedReferrerCard({ referrer }: { referrer: ReferralReferrerLookupMatch }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
      <input type="hidden" name="referralCode" value={referrer.referralCode} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Referred by: {referrerName(referrer)}</span>
        <StatusBadge status="ACTIVE" />
      </div>
      <p className="mt-1">
        {maskPhoneNumber(referrer.globalCustomer.normalizedPhone)} - {fromStoredTier(referrer.currentTier) ?? "Bronze"}
      </p>
      <p className="mt-1 font-mono text-xs text-emerald-800">{referrer.referralCode}</p>
    </div>
  );
}

function ReferrerSummary({ referrer }: { referrer: ReferralReferrerLookupMatch }) {
  return (
    <span className="min-w-0">
      <span className="block font-semibold text-[#111827]">{referrerName(referrer)}</span>
      <span className="block text-[#6B7280]">
        {maskPhoneNumber(referrer.globalCustomer.normalizedPhone)} - {fromStoredTier(referrer.currentTier) ?? "Bronze"}
      </span>
      <span className="block break-all font-mono text-xs text-[#6B7280]">{referrer.referralCode}</span>
    </span>
  );
}

function referrerName(referrer: ReferralReferrerLookupMatch) {
  return `${referrer.globalCustomer.firstName} ${referrer.globalCustomer.lastName ?? ""}`.trim();
}
