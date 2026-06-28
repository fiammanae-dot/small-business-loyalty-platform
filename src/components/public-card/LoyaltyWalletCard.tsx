import Image from "next/image";
import { WalletCardShell, type WalletTheme } from "@/components/public-card/WalletCardShell";

export type LoyaltyWalletCardProps = {
  businessName: string;
  businessLogoUrl?: string | null;
  customerName: string;
  memberSince: string;
  tierLabel: string;
  tierIcon: string;
  qrCode: string | null;
  rewardReady: boolean;
  qrHelperText?: string;
  theme: WalletTheme;
  exportMode?: boolean;
  programName?: string | null;
  rewardName?: string | null;
  progress?: number;
  required?: number;
  remaining?: number;
  completion?: number;
};

export function LoyaltyWalletCard({
  businessName,
  businessLogoUrl,
  customerName,
  memberSince,
  tierLabel,
  tierIcon,
  qrCode,
  rewardReady,
  qrHelperText = "Scan this card",
  theme,
  exportMode = false,
  programName,
  rewardName,
  progress = 0,
  required = 0,
  remaining = 0,
  completion = 0,
}: LoyaltyWalletCardProps) {
  const displayRequired = required > 0 ? required : 1;
  const displayProgress = required > 0 ? progress : 0;
  const displayCompletion = required > 0 ? completion : 0;
  const displayReward = rewardName ?? "Loyalty reward";
  const offerText = required > 0 ? `Buy ${displayRequired} visits, get ${displayReward}` : "Show this card to staff to join a loyalty program";
  const statusText = required > 0 ? (rewardReady ? displayReward : `${remaining} visit${remaining === 1 ? "" : "s"} away`) : "No program yet";

  return (
    <WalletCardShell theme={theme} exportMode={exportMode}>
      <div className="px-6 pb-5 pt-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {businessLogoUrl ? (
              <div
                aria-label={`${businessName} logo`}
                className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center shadow-sm"
                style={{ backgroundImage: `url(${businessLogoUrl})`, backgroundColor: theme.logoBackground }}
              />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black shadow-sm"
                style={{ backgroundColor: theme.logoBackground, color: theme.logoText }}
                aria-hidden="true"
              >
                {theme.style === "premium-dark" ? tierIcon : businessName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-bold leading-tight">{businessName}</h1>
              <p className="pt-0.5 text-[15px]" style={{ color: theme.mutedText }}>{programName ?? "Loyalty Card"}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: theme.mutedText }}>Member</p>
            <span
              className="mt-2 inline-flex rounded-full px-3 py-1 text-[14px] font-semibold ring-1"
              style={{
                backgroundColor: theme.badgeBackground,
                color: theme.badgeText,
                borderColor: theme.badgeBorder,
                boxShadow: theme.style === "modern-clean" ? "0 0 0 1px rgba(249,115,22,0.10), 0 0 18px rgba(249,115,22,0.10)" : undefined,
              }}
            >
              {tierLabel}
            </span>
          </div>
        </div>

        <p className="pt-8 text-center text-[15px]" style={{ color: theme.mutedText }}>{offerText}</p>

        <section className="pt-8">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: theme.cardText }}>Progress</p>
            <p className="text-[24px] font-extrabold tracking-[-0.04em]">
              {displayProgress} / {displayRequired}
            </p>
          </div>
          <div className="mt-3 h-[12px] rounded-full" style={{ backgroundColor: theme.progressTrack }}>
            <div
              className="h-full rounded-full transition-all duration-[220ms] motion-reduce:transition-none"
              style={{ width: `${displayCompletion}%`, background: theme.progressFill }}
            />
          </div>
          <p className="pt-4 text-[14px]" style={{ color: theme.mutedText }}>
            {required > 0 ? (rewardReady ? `${displayReward} is ready` : `${remaining} visit${remaining === 1 ? "" : "s"} until your reward`) : "Ask staff to enroll this card in a program"}
          </p>
        </section>

        <section className="pt-8 text-center">
          <div className="mx-auto flex h-[168px] w-[168px] items-center justify-center rounded-[10px] bg-white p-3 shadow-lg ring-1 ring-black/5 transition-transform duration-[180ms] hover:scale-[1.02] motion-reduce:transition-none">
            {qrCode ? (
              exportMode ? (
                <div
                  aria-label={`${businessName} customer card QR code`}
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${qrCode}")` }}
                />
              ) : (
                <Image src={qrCode} alt={`${businessName} customer card QR code`} width={144} height={144} unoptimized priority className="h-full w-full" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-md text-sm font-bold" style={{ backgroundColor: theme.surface, color: theme.accent }}>
                QR pending
              </div>
            )}
          </div>
          <p className="pt-4 text-[14px]" style={{ color: theme.mutedText }}>{qrHelperText}</p>
        </section>
      </div>

      <div className="px-5 pb-5">
        <section
          className="rounded-[16px] px-4 py-4 shadow-md ring-1"
          style={{
            backgroundColor: theme.rewardPanelBackground,
            color: theme.rewardPanelText,
            borderColor: theme.rewardPanelBorder,
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.rewardPanelMuted }}>Reward</p>
              <p className="pt-1 text-[16px] font-semibold">{rewardReady ? "Reward Ready" : displayReward}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.rewardPanelMuted }}>Status</p>
              <p className="pt-1 text-[16px] font-semibold">{statusText}</p>
            </div>
          </div>
        </section>
      </div>

      <span className="sr-only">Customer {customerName}. Member Since {memberSince}.</span>
    </WalletCardShell>
  );
}
