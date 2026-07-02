import { WalletCardShell } from "@/components/public-card/WalletCardShell";
import type { LoyaltyWalletCardProps } from "@/components/public-card/LoyaltyWalletCard";
import { resolveCardDesign } from "@/lib/card-design";

export function LoyaltyCardBackExport({ wallet }: { wallet: Omit<LoyaltyWalletCardProps, "exportMode"> }) {
  const design = resolveCardDesign(wallet.cardDesign);
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
  const summaryRows = [
    ...(design.visibleSections.businessName ? [["Business", wallet.businessName]] : []),
    ...(design.visibleSections.customerName ? [["Customer", wallet.customerName]] : []),
    ...(design.visibleSections.programName ? [["Program", displayProgram]] : []),
    ...(design.visibleSections.progress ? [["Progress", `${displayProgress} / ${displayRequired} visits`]] : []),
    ...(design.visibleSections.rewardBox ? [["Reward", displayReward]] : []),
    ...(design.visibleSections.visits ? [["Status", wallet.rewardReady ? "Reward Ready" : statusText]] : []),
  ];

  return (
    <div className="w-[360px] bg-transparent">
      <WalletCardShell theme={wallet.theme} cardDesign={design} exportMode>
        <div className="px-5 pb-5 pt-6">
          <div className="grid gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: wallet.theme.mutedText }}>
                Scan View
              </p>
              <h2 className="mt-1 text-[24px] font-extrabold leading-tight tracking-[-0.04em]">Present this QR at checkout</h2>
            </div>
          </div>

          {design.visibleSections.qr ? <section className="pt-5 text-center">
            <div className="mx-auto flex h-[214px] w-[214px] items-center justify-center rounded-[18px] border border-black/5 bg-white p-4">
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
          </section> : null}

          {summaryRows.length ? <section className="pt-5">
            <div className="rounded-[18px] border px-4 py-2.5" style={{ backgroundColor: wallet.theme.rewardPanelBackground, color: wallet.theme.rewardPanelText, borderColor: wallet.theme.rewardPanelBorder }}>
              <div className="grid">
                {summaryRows.map(([label, value], index) => (
                  <SummaryLine
                    key={label}
                    label={label}
                    value={value}
                    theme={wallet.theme}
                    isLast={index === summaryRows.length - 1}
                  />
                ))}
              </div>
            </div>
          </section> : null}
        </div>
      </WalletCardShell>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  theme,
  isLast,
}: {
  label: string;
  value: string;
  theme: Omit<LoyaltyWalletCardProps, "exportMode">["theme"];
  isLast: boolean;
}) {
  return (
    <div className={`flex min-h-9 items-center justify-between gap-4 py-2 ${isLast ? "" : "border-b border-black/5"}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.rewardPanelMuted }}>{label}</span>
      <span className="max-w-[190px] text-right text-[13px] font-bold leading-snug">{value}</span>
    </div>
  );
}
