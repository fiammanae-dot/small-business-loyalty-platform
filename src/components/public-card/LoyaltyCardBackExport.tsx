import { WalletCardShell } from "@/components/public-card/WalletCardShell";
import type { LoyaltyWalletCardProps } from "@/components/public-card/LoyaltyWalletCard";

export function LoyaltyCardBackExport({ wallet }: { wallet: Omit<LoyaltyWalletCardProps, "exportMode"> }) {
  const displayRequired = wallet.required && wallet.required > 0 ? wallet.required : 1;
  const displayProgress = wallet.required && wallet.required > 0 ? (wallet.progress ?? 0) : 0;
  const displayReward = wallet.rewardName ?? "Loyalty reward";
  const displayProgram = wallet.programName ?? "Loyalty Card";
  const remaining = wallet.remaining ?? 0;
  const statusText = wallet.required && wallet.required > 0
    ? wallet.rewardReady
      ? "Reward Ready"
      : remaining === 1
        ? "1 visit remaining"
        : `${remaining} visits remaining`
    : "No active program yet";

  return (
    <div className="w-[360px] bg-transparent">
      <WalletCardShell theme={wallet.theme} exportMode>
        <div className="px-6 pb-5 pt-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: wallet.theme.mutedText }}>
                Scan View
              </p>
              <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.04em]">Present this QR at checkout</h2>
            </div>
            <span className="shrink-0 rounded-full px-3 py-2 text-[13px] font-bold ring-1" style={{ color: wallet.theme.cardText, borderColor: wallet.theme.badgeBorder, backgroundColor: wallet.theme.badgeBackground }}>
              Back
            </span>
          </div>

          <section className="pt-7 text-center">
            <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-[18px] bg-white p-4 shadow-lg ring-1 ring-black/5">
              {wallet.qrCode ? (
                <div
                  aria-label={`${wallet.businessName} customer card QR code`}
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${wallet.qrCode}")` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md text-sm font-bold text-[#F97316]">
                  QR pending
                </div>
              )}
            </div>
            <p className="pt-4 text-[15px] font-semibold" style={{ color: wallet.theme.cardText }}>
              Present this QR at checkout
            </p>
            <p className="pt-1 text-[13px]" style={{ color: wallet.theme.mutedText }}>
              {wallet.qrHelperText ?? "Scan this card"}
            </p>
          </section>

          <section className="pt-7">
            <div className="rounded-[18px] px-4 py-4 ring-1" style={{ backgroundColor: wallet.theme.rewardPanelBackground, color: wallet.theme.rewardPanelText, borderColor: wallet.theme.rewardPanelBorder }}>
              <div className="grid gap-3">
                <SummaryLine label="Business" value={wallet.businessName} theme={wallet.theme} />
                <SummaryLine label="Customer" value={wallet.customerName} theme={wallet.theme} />
                <SummaryLine label="Program" value={displayProgram} theme={wallet.theme} />
                <SummaryLine label="Progress" value={`${displayProgress} / ${displayRequired} visits`} theme={wallet.theme} />
                <SummaryLine label="Reward" value={displayReward} theme={wallet.theme} />
                <SummaryLine label="Status" value={wallet.rewardReady ? "Reward Ready" : statusText} theme={wallet.theme} />
              </div>
            </div>
          </section>
        </div>
      </WalletCardShell>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Omit<LoyaltyWalletCardProps, "exportMode">["theme"];
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.rewardPanelMuted }}>{label}</span>
      <span className="text-right text-[14px] font-bold">{value}</span>
    </div>
  );
}
