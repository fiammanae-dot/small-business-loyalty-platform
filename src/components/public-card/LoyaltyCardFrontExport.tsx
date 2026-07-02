import { WalletCardShell } from "@/components/public-card/WalletCardShell";
import type { LoyaltyWalletCardProps } from "@/components/public-card/LoyaltyWalletCard";
import { resolveCardDesign, type CardDesign } from "@/lib/card-design";
import type { CSSProperties } from "react";

const exportBusinessNameClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
};

const exportProgramNameClampStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export function LoyaltyCardFrontExport({ wallet }: { wallet: Omit<LoyaltyWalletCardProps, "exportMode"> }) {
  const design = resolveCardDesign(wallet.cardDesign);
  const displayRequired = wallet.required && wallet.required > 0 ? wallet.required : 1;
  const displayProgress = wallet.required && wallet.required > 0 ? (wallet.progress ?? 0) : 0;
  const displayCompletion = wallet.required && wallet.required > 0 ? (wallet.completion ?? 0) : 0;
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
      <WalletCardShell theme={wallet.theme} cardDesign={design} exportMode>
        <div className="px-5 pb-5 pt-6">
          {(design.visibleSections.logo || design.visibleSections.businessName || design.visibleSections.programName || design.visibleSections.tierBadge) ? (
            <ExportHeader wallet={wallet} displayProgram={displayProgram} design={design} />
          ) : null}

          {design.visibleSections.customerName ? <section className="pt-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: wallet.theme.mutedText }}>
              Customer
            </p>
            <h2 className="mt-2 text-[28px] font-extrabold leading-[1.05] tracking-[-0.05em]">
              {wallet.customerName}
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: wallet.theme.mutedText }}>
              Member since {wallet.memberSince}
            </p>
          </section> : null}

          {design.visibleSections.progress ? <section className="pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: wallet.theme.mutedText }}>
                  Progress
                </p>
                <p className="mt-1 text-[38px] font-black leading-none tracking-[-0.06em]">
                  {displayProgress}
                  <span className="text-[20px] font-extrabold" style={{ color: wallet.theme.mutedText }}>
                    /{displayRequired}
                  </span>
                </p>
              </div>
              {design.visibleSections.visits ? <div className="text-right">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: wallet.theme.mutedText }}>
                  Visits
                </p>
                <p className="mt-1 text-[16px] font-bold">{wallet.rewardReady ? "Complete" : statusText}</p>
              </div> : null}
            </div>
            <div className="mt-4 h-[12px] overflow-hidden rounded-full" style={{ backgroundColor: wallet.theme.progressTrack }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${displayCompletion}%`, background: wallet.theme.progressFill }}
              />
            </div>
          </section> : null}

          {design.visibleSections.rewardBox ? <section
            className="mt-5 rounded-[18px] border px-4 py-3"
            style={{
              ...exportRewardStyle(design, wallet),
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: wallet.rewardReady ? "#2F6F44" : wallet.theme.rewardPanelMuted }}>
                  Next reward
                </p>
                <p className="pt-1 text-[17px] font-bold">{displayReward}</p>
              </div>
              <div className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-black" style={{ backgroundColor: wallet.rewardReady ? "#DCFCE7" : wallet.theme.badgeBackground, color: wallet.rewardReady ? "#15803D" : wallet.theme.badgeText, borderColor: wallet.rewardReady ? "rgba(21,128,61,0.22)" : wallet.theme.badgeBorder }}>
                {wallet.rewardReady ? "Reward Ready" : statusText}
              </div>
            </div>
          </section> : null}

          {design.visibleSections.footer ? <div className="pt-5">
            <div className="flex min-h-12 w-full items-center justify-center rounded-[16px] px-5 text-[15px] font-bold" style={{ background: wallet.theme.ctaBackground, color: wallet.theme.ctaForeground }}>
              Scan at Checkout
            </div>
          </div> : null}
        </div>
      </WalletCardShell>
    </div>
  );
}

function ExportHeader({
  wallet,
  displayProgram,
  design,
}: {
  wallet: Omit<LoyaltyWalletCardProps, "exportMode">;
  displayProgram: string;
  design: CardDesign;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
      {design.visibleSections.logo && wallet.businessLogoUrl ? (
        <div
          aria-label={`${wallet.businessName} logo`}
          className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url(${wallet.businessLogoUrl})`, backgroundColor: wallet.theme.logoBackground }}
        />
      ) : design.visibleSections.logo ? (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black"
          style={{ backgroundColor: wallet.theme.logoBackground, color: wallet.theme.logoText }}
          aria-hidden="true"
        >
          {wallet.theme.style === "premium-dark" ? wallet.tierIcon : wallet.businessName.slice(0, 1).toUpperCase()}
        </div>
      ) : null}
      <div className="min-w-0 pr-1">
        {design.visibleSections.businessName ? <h1
          className="text-[18px] font-extrabold leading-[1.08] tracking-[-0.02em]"
          style={exportBusinessNameClampStyle}
          title={wallet.businessName}
        >
          {wallet.businessName}
        </h1> : null}
        {design.visibleSections.programName ? <p
          className="pt-1 text-[13px] font-medium leading-tight"
          style={{ ...exportProgramNameClampStyle, color: wallet.theme.mutedText }}
          title={displayProgram}
        >
          {displayProgram}
        </p> : null}
      </div>
      {design.visibleSections.tierBadge ? <div className="w-[104px] shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: wallet.theme.mutedText }}>Tier</p>
        <span
          className="mt-2 inline-flex max-w-full justify-center rounded-full border px-3 py-1 text-center text-[12px] font-semibold leading-tight"
          style={{
            backgroundColor: wallet.theme.badgeBackground,
            color: wallet.theme.badgeText,
            borderColor: wallet.theme.badgeBorder,
          }}
        >
          {wallet.tierLabel}
        </span>
      </div> : null}
    </div>
  );
}

function exportRewardStyle(design: CardDesign, wallet: Omit<LoyaltyWalletCardProps, "exportMode">): CSSProperties {
  if (wallet.rewardReady) return { backgroundColor: "#E9F7EE", color: "#14532D", borderColor: "rgba(47, 111, 68, 0.28)" };
  if (design.rewardStyle === "OUTLINE") return { backgroundColor: "transparent", color: wallet.theme.cardText, borderColor: wallet.theme.badgeBorder };
  if (design.rewardStyle === "GLASS") return { backgroundColor: "rgba(255,255,255,0.18)", color: wallet.theme.cardText, borderColor: "rgba(255,255,255,0.30)" };
  if (design.rewardStyle === "PREMIUM") return { backgroundColor: wallet.theme.rewardPanelBackground, color: wallet.theme.rewardPanelText, borderColor: wallet.theme.accent };
  return { backgroundColor: wallet.theme.rewardPanelBackground, color: wallet.theme.rewardPanelText, borderColor: wallet.theme.rewardPanelBorder };
}
