import { StatusBadge } from "@/components/StatusBadge";
import { maskPhoneNumber } from "@/lib/customer-cards";
import { fromStoredTier } from "@/lib/customer-tiers";
import { previewActiveReferralReferrerByPhone } from "@/lib/referrals";

export async function ReferralPhoneLookupPreview({ businessId, phone }: { businessId: number; phone?: string }) {
  const trimmedPhone = phone?.trim();
  if (!trimmedPhone) return null;

  const lookup = await previewActiveReferralReferrerByPhone({ businessId, phone: trimmedPhone });

  if (lookup.status === "INVALID_PHONE") {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Enter a valid referred-by UAE mobile number to confirm the referrer.
      </p>
    );
  }

  if (lookup.status === "NOT_FOUND" || !lookup.referrer) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        No active customer was found for this referred-by phone number.
      </p>
    );
  }

  const referrerName = `${lookup.referrer.globalCustomer.firstName} ${lookup.referrer.globalCustomer.lastName ?? ""}`.trim();
  const tier = fromStoredTier(lookup.referrer.currentTier) ?? "Bronze";

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Referred by: {referrerName}</span>
        <StatusBadge status="ACTIVE" />
      </div>
      <p className="mt-1">
        {maskPhoneNumber(lookup.referrer.globalCustomer.normalizedPhone)} - {tier}
      </p>
    </div>
  );
}
