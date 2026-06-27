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
  theme: WalletTheme;
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
  theme,
}: LoyaltyWalletCardProps) {
  const isLight = theme.style === "minimal-light";

  return (
    <WalletCardShell theme={theme}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {businessLogoUrl ? (
            <div
              aria-label={`${businessName} logo`}
              className="h-14 w-14 shrink-0 bg-cover bg-center ring-1"
              style={{ backgroundImage: `url(${businessLogoUrl})`, borderRadius: theme.innerRadius, backgroundColor: theme.panelBackground, borderColor: theme.border }}
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center text-base font-black ring-1"
              style={{ borderRadius: theme.innerRadius, backgroundColor: theme.panelBackground, color: theme.cardText, borderColor: theme.border }}
            >
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.mutedText }}>LoyaltyBase</p>
            <h1 className="mt-1 truncate text-lg font-bold leading-tight">{businessName}</h1>
          </div>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1" style={{ backgroundColor: theme.panelBackground, borderColor: theme.border }}>
          {rewardReady ? "Reward Ready" : "Live Card"}
        </span>
      </div>

      <div className="mt-9">
        <p className="text-sm font-semibold" style={{ color: theme.mutedText }}>Customer</p>
        <h2 className="mt-1 break-words text-4xl font-black tracking-tight sm:text-5xl">{customerName}</h2>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ring-1"
          style={{ backgroundColor: isLight ? theme.surface : theme.panelBackground, color: isLight ? theme.accent : theme.cardText, borderColor: theme.border }}
        >
          <span aria-hidden="true">{tierIcon}</span>
          <span>{tierLabel}</span>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="p-4 ring-1 backdrop-blur" style={{ borderRadius: theme.innerRadius, backgroundColor: theme.panelBackground, borderColor: theme.border }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.mutedText }}>Member Since</p>
          <p className="mt-2 text-2xl font-black tracking-wide">{memberSince}</p>
          <p className="mt-2 text-sm font-medium" style={{ color: theme.mutedText }}>Show this card when earning stamps or redeeming rewards.</p>
        </div>

        <div className="p-3 text-center shadow-xl" style={{ borderRadius: theme.innerRadius, backgroundColor: theme.qrSurface }}>
          {qrCode ? (
            <Image src={qrCode} alt={`${businessName} customer card QR code`} width={178} height={178} unoptimized priority />
          ) : (
            <div className="flex h-[178px] w-[178px] items-center justify-center rounded-2xl text-sm font-bold" style={{ backgroundColor: theme.surface, color: theme.accent }}>
              QR pending
            </div>
          )}
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#64748B]">Scan this card</p>
        </div>
      </div>
    </WalletCardShell>
  );
}
