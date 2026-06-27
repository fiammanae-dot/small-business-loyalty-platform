import { Link2, Sparkles } from "lucide-react";
import { ReferralShareActions } from "@/components/ReferralShareActions";
import type { WalletTheme } from "@/components/public-card/WalletCardShell";
import { withAlpha } from "@/lib/card-themes";

export type ReferralPanelProps = {
  referralUrl: string;
  referralCode: string | null;
  businessName: string;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardsEarned: string;
  buttonColor: string;
  theme: WalletTheme;
};

export function ReferralPanel({
  referralUrl,
  referralCode,
  businessName,
  pendingReferrals,
  qualifiedReferrals,
  rewardsEarned,
  buttonColor,
  theme,
}: ReferralPanelProps) {
  return (
    <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl transition hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ outlineColor: theme.accent }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(theme.accent, 0.1), color: theme.accent }}>
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#1E293B]">Refer a friend</h2>
              <p className="mt-1 text-sm text-[#64748B]">Share your link and track referral rewards.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide transition" style={{ backgroundColor: withAlpha(theme.accent, 0.08), color: theme.accent }}>
            Details
          </span>
        </summary>

        <div className="mt-4 border-t border-[#E5E7EB] pt-4">
          <p className="text-sm leading-6 text-[#64748B]">
            Share your referral link. Rewards are granted after your friend joins and earns their first stamp.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl p-4" style={{ backgroundColor: withAlpha(theme.accent, 0.08) }}>
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: theme.text }}>Referral Code</p>
              <p className="mt-2 break-all font-mono text-lg font-black text-[#1E293B]">{referralCode}</p>
            </div>
            <div className="rounded-2xl bg-[#F8FAFC] p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#64748B]">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Referral Link
              </p>
              <p className="mt-2 line-clamp-2 break-all text-sm font-semibold text-[#1E293B]">{referralUrl}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Info label="Pending Referrals" value={pendingReferrals.toString()} />
            <Info label="Qualified Referrals" value={qualifiedReferrals.toString()} />
            <Info label="Rewards Earned" value={rewardsEarned} />
          </div>

          <div className="mt-4">
            <ReferralShareActions referralUrl={referralUrl} businessName={businessName} buttonColor={buttonColor} />
          </div>
        </div>
      </details>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFA] p-3">
      <p className="text-xs font-medium text-[#6B7280]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
