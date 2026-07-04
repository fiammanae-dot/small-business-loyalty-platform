"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { StampIconGraphic } from "@/components/design-studio/StampIconGraphic";
import { WalletCardShell, type WalletTheme } from "@/components/public-card/WalletCardShell";
import { resolveCardDesign, type CardDesign, type CardDesignInput } from "@/lib/card-design";

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
  cardDesign?: CardDesignInput;
};

const businessNameClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
};

const programNameClampStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
  cardDesign,
}: LoyaltyWalletCardProps) {
  const [mode, setMode] = useState<"wallet" | "scan">("wallet");
  const design = resolveCardDesign(cardDesign);
  const displayRequired = required > 0 ? required : 1;
  const displayProgress = required > 0 ? progress : 0;
  const displayCompletion = required > 0 ? completion : 0;
  const displayReward = rewardName ?? "Loyalty reward";
  const displayProgram = programName ?? "Loyalty Card";
  const remainingText = remaining === 1 ? "1 visit remaining" : `${remaining} visits remaining`;
  const statusText = required > 0 ? (rewardReady ? "Reward Ready" : remainingText) : "No active program yet";
  const showScanView = !exportMode && mode === "scan";

  return (
    <WalletCardShell theme={theme} exportMode={exportMode} cardDesign={design}>
      <div
        className="transition-opacity duration-[220ms] motion-reduce:transition-none"
        aria-live="polite"
      >
        {showScanView ? (
          <ScanView
            businessName={businessName}
            displayProgram={displayProgram}
            displayProgress={displayProgress}
            displayRequired={displayRequired}
            displayReward={displayReward}
            exportMode={exportMode}
            qrCode={qrCode}
            qrHelperText={qrHelperText}
            rewardReady={rewardReady}
            statusText={statusText}
            theme={theme}
            design={design}
            onBack={() => setMode("wallet")}
          />
        ) : (
          <WalletView
            businessLogoUrl={businessLogoUrl}
            businessName={businessName}
            customerName={customerName}
            displayCompletion={displayCompletion}
            displayProgram={displayProgram}
            displayProgress={displayProgress}
            displayRequired={displayRequired}
            displayReward={displayReward}
            exportMode={exportMode}
            memberSince={memberSince}
            rewardReady={rewardReady}
            statusText={statusText}
            theme={theme}
            design={design}
            tierIcon={tierIcon}
            tierLabel={tierLabel}
            onScan={() => setMode("scan")}
          />
        )}
      </div>

      <span className="sr-only">Customer {customerName}. Member Since {memberSince}.</span>
    </WalletCardShell>
  );
}

function WalletView({
  businessLogoUrl,
  businessName,
  customerName,
  displayCompletion,
  displayProgram,
  displayProgress,
  displayRequired,
  displayReward,
  exportMode,
  memberSince,
  rewardReady,
  statusText,
  theme,
  design,
  tierIcon,
  tierLabel,
  onScan,
}: {
  businessLogoUrl?: string | null;
  businessName: string;
  customerName: string;
  displayCompletion: number;
  displayProgram: string;
  displayProgress: number;
  displayRequired: number;
  displayReward: string;
  exportMode: boolean;
  memberSince: string;
  rewardReady: boolean;
  statusText: string;
  theme: WalletTheme;
  design: CardDesign;
  tierIcon: string;
  tierLabel: string;
  onScan: () => void;
}) {
  return (
    <div className={`px-6 pb-5 pt-7 ${cardPaddingClass(design)}`}>
      {(design.visibleSections.logo || design.visibleSections.businessName || design.visibleSections.programName || design.visibleSections.tierBadge) ? (
        <CardHeader
          businessLogoUrl={businessLogoUrl}
          businessName={businessName}
          displayProgram={displayProgram}
          theme={theme}
          design={design}
          tierIcon={tierIcon}
          tierLabel={tierLabel}
        />
      ) : null}

      {design.visibleSections.customerName ? (
        <section className="pt-7">
          <p className={labelClass(design)} style={{ color: theme.mutedText }}>
            Customer
          </p>
          <h2 className={customerClass(design)}>
            {customerName}
          </h2>
          <p className={supportingClass(design)} style={{ color: theme.mutedText }}>
            Member since {memberSince}
          </p>
        </section>
      ) : null}

      {design.visibleSections.progress ? (
        <ProgressSection
          completion={displayCompletion}
          current={displayProgress}
          design={design}
          required={displayRequired}
          rewardReady={rewardReady}
          statusText={statusText}
          theme={theme}
        />
      ) : null}

      {design.visibleSections.rewardBox ? (
        <RewardPanel
          design={design}
          displayReward={displayReward}
          rewardReady={rewardReady}
          statusText={statusText}
          theme={theme}
        />
      ) : null}

      {design.visibleSections.footer ? (
        <div className="pt-5">
          {exportMode ? (
            <div className="flex min-h-12 w-full items-center justify-center rounded-[16px] px-5 text-[15px] font-bold shadow-sm" style={{ background: theme.ctaBackground, color: theme.ctaForeground }}>
              Scan at Checkout
            </div>
          ) : (
            <button
              type="button"
              onClick={onScan}
              className="flex min-h-12 w-full items-center justify-center rounded-[16px] px-5 text-[15px] font-bold shadow-sm transition duration-[180ms] hover:translate-y-[-1px] focus:outline-none focus:ring-4 focus:ring-orange-200 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ background: theme.ctaBackground, color: theme.ctaForeground }}
            >
              Scan at Checkout
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ScanView({
  businessName,
  displayProgram,
  displayProgress,
  displayRequired,
  displayReward,
  exportMode,
  qrCode,
  qrHelperText,
  rewardReady,
  statusText,
  theme,
  design,
  onBack,
}: {
  businessName: string;
  displayProgram: string;
  displayProgress: number;
  displayRequired: number;
  displayReward: string;
  exportMode: boolean;
  qrCode: string | null;
  qrHelperText: string;
  rewardReady: boolean;
  statusText: string;
  theme: WalletTheme;
  design: CardDesign;
  onBack: () => void;
}) {
  return (
    <div className="px-6 pb-5 pt-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.mutedText }}>
            Scan View
          </p>
          <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.04em]">Present this QR at checkout</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-3 py-2 text-[13px] font-bold ring-1 transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-orange-200 motion-reduce:transition-none"
          style={{ color: theme.cardText, borderColor: theme.badgeBorder, backgroundColor: theme.badgeBackground }}
        >
          Back
        </button>
      </div>

      {design.visibleSections.qr ? (
      <section className="pt-7 text-center">
        <QrBlock
          businessName={businessName}
          exportMode={exportMode}
          qrCode={qrCode}
          sizeClassName="h-[220px] w-[220px]"
        />
        <p className="pt-4 text-[15px] font-semibold" style={{ color: theme.cardText }}>
          Present this QR at checkout
        </p>
        <p className="pt-1 text-[13px]" style={{ color: theme.mutedText }}>
          {qrHelperText}
        </p>
      </section>
      ) : null}

      <section className="pt-7">
        <div className="rounded-[18px] px-4 py-4 ring-1" style={{ backgroundColor: theme.rewardPanelBackground, color: theme.rewardPanelText, borderColor: theme.rewardPanelBorder }}>
          <div className="grid gap-3">
            {design.visibleSections.programName ? <SummaryLine label="Program" value={displayProgram} theme={theme} /> : null}
            {design.visibleSections.progress ? <SummaryLine label="Progress" value={`${displayProgress} / ${displayRequired} visits`} theme={theme} /> : null}
            {design.visibleSections.rewardBox ? <SummaryLine label="Next reward" value={displayReward} theme={theme} /> : null}
            {design.visibleSections.visits ? <SummaryLine label="Status" value={rewardReady ? "Reward Ready" : statusText} theme={theme} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function CardHeader({
  businessLogoUrl,
  businessName,
  displayProgram,
  theme,
  design,
  tierIcon,
  tierLabel,
}: {
  businessLogoUrl?: string | null;
  businessName: string;
  displayProgram: string;
  theme: WalletTheme;
  design: CardDesign;
  tierIcon: string;
  tierLabel: string;
}) {
  const showSecondRow = design.visibleSections.programName || design.visibleSections.tierBadge;
  return (
    <div className="flex items-start gap-3">
      {design.visibleSections.logo && businessLogoUrl ? (
        <div
          aria-label={`${businessName} logo`}
          className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center shadow-sm"
          style={{ backgroundImage: `url(${businessLogoUrl})`, backgroundColor: theme.logoBackground }}
        />
      ) : design.visibleSections.logo ? (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black shadow-sm"
          style={{ backgroundColor: theme.logoBackground, color: theme.logoText }}
          aria-hidden="true"
        >
          {theme.style === "premium-dark" ? tierIcon : businessName.slice(0, 1).toUpperCase()}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {design.visibleSections.businessName ? <h1
          className="text-[18px] font-extrabold leading-[1.15] tracking-[-0.02em]"
          style={businessNameClampStyle}
          title={businessName}
        >
          {businessName}
        </h1> : null}
        {showSecondRow ? (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {design.visibleSections.programName ? (
              <p
                className="min-w-0 flex-1 text-[13px] font-medium leading-tight"
                style={{ ...programNameClampStyle, color: theme.mutedText }}
                title={displayProgram}
              >
                {displayProgram}
              </p>
            ) : <span />}
            {design.visibleSections.tierBadge ? (
              <span
                className="inline-flex max-w-[42%] shrink-0 justify-center rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-tight ring-1"
                style={{
                  backgroundColor: theme.badgeBackground,
                  color: theme.badgeText,
                  borderColor: theme.badgeBorder,
                  boxShadow: theme.style === "modern-clean" ? "0 0 0 1px rgba(249,115,22,0.10), 0 0 18px rgba(249,115,22,0.10)" : undefined,
                }}
                title={tierLabel}
              >
                {tierLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RewardPanel({
  design,
  displayReward,
  rewardReady,
  statusText,
  theme,
}: {
  design: CardDesign;
  displayReward: string;
  rewardReady: boolean;
  statusText: string;
  theme: WalletTheme;
}) {
  const style = rewardPanelStyle(design, theme, rewardReady);
  return (
    <section
      className={`mt-7 rounded-[18px] px-4 py-4 ring-1 ${style.className}`}
      style={style.style}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: rewardReady ? "#2F6F44" : theme.rewardPanelMuted }}>
            Next reward
          </p>
          <p className="pt-1 text-[17px] font-bold">{displayReward}</p>
        </div>
        <div className="shrink-0 rounded-full px-3 py-1 text-[13px] font-black" style={{ backgroundColor: rewardReady ? "#DCFCE7" : theme.badgeBackground, color: rewardReady ? "#15803D" : theme.badgeText }}>
          {rewardReady ? "Reward Ready" : statusText}
        </div>
      </div>
    </section>
  );
}

function ProgressSection({
  completion,
  current,
  design,
  required,
  rewardReady,
  statusText,
  theme,
}: {
  completion: number;
  current: number;
  design: CardDesign;
  required: number;
  rewardReady: boolean;
  statusText: string;
  theme: WalletTheme;
}) {
  const nodes = Array.from({ length: Math.min(required, 10) }, (_, index) => index < current);
  const visitsVisible = design.visibleSections.visits;
  if (design.stampJourneyStyle === "PROGRESS_BAR") {
    return (
      <section className="pt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={labelClass(design)} style={{ color: theme.mutedText }}>Progress</p>
            <p className={progressClass(design)}>
              {current}
              <span className="text-[20px] font-extrabold" style={{ color: theme.mutedText }}>/{required}</span>
            </p>
          </div>
          {visitsVisible ? <div className="text-right"><p className={labelClass(design)} style={{ color: theme.mutedText }}>Visits</p><p className="mt-1 text-[16px] font-bold">{rewardReady ? "Complete" : statusText}</p></div> : null}
        </div>
        <div className="mt-4 h-[10px] overflow-hidden rounded-full" style={{ backgroundColor: theme.progressTrack }}>
          <div className="h-full rounded-full transition-all duration-[220ms] motion-reduce:transition-none" style={{ width: `${completion}%`, background: theme.progressFill }} />
        </div>
      </section>
    );
  }

  return (
    <section className="pt-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={labelClass(design)} style={{ color: theme.mutedText }}>Progress</p>
          <p className={progressClass(design)}>{current}<span className="text-[20px] font-extrabold" style={{ color: theme.mutedText }}>/{required}</span></p>
        </div>
        {visitsVisible ? <div className="text-right"><p className={labelClass(design)} style={{ color: theme.mutedText }}>Visits</p><p className="mt-1 text-[16px] font-bold">{rewardReady ? "Complete" : statusText}</p></div> : null}
      </div>
      <div className={`mt-4 grid ${nodes.length > 5 ? "grid-cols-5" : "grid-cols-3"} gap-2`}>
        {nodes.map((filled, index) => (
          <span key={index} className="relative grid h-9 place-items-center rounded-full border" style={{ background: filled ? theme.progressFill : theme.progressTrack, borderColor: filled ? "transparent" : theme.border, color: filled ? theme.ctaForeground : theme.mutedText }}>
            {design.stampJourneyStyle === "CONNECTED_DOTS" && index > 0 ? <span className="absolute right-full top-1/2 h-0.5 w-2 -translate-y-1/2" style={{ background: filled ? theme.progressFill : theme.progressTrack }} /> : null}
            <StampIconGraphic stampIcon={design.stampIcon} mode="customer" className="h-[18px] w-[18px]" />
          </span>
        ))}
      </div>
    </section>
  );
}

function QrBlock({
  businessName,
  exportMode,
  qrCode,
  sizeClassName,
}: {
  businessName: string;
  exportMode: boolean;
  qrCode: string | null;
  sizeClassName: string;
}) {
  return (
    <div className={`mx-auto flex ${sizeClassName} items-center justify-center rounded-[18px] bg-white p-4 shadow-lg ring-1 ring-black/5 transition-transform duration-[180ms] hover:scale-[1.01] motion-reduce:transition-none`}>
      {qrCode ? (
        exportMode ? (
          <div
            aria-label={`${businessName} customer card QR code`}
            className="h-full w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${qrCode}")` }}
          />
        ) : (
          <Image src={qrCode} alt={`${businessName} customer card QR code`} width={192} height={192} unoptimized priority className="h-full w-full" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md text-sm font-bold text-[#F97316]">
          QR pending
        </div>
      )}
    </div>
  );
}

function SummaryLine({ label, value, theme }: { label: string; value: string; theme: WalletTheme }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.rewardPanelMuted }}>{label}</span>
      <span className="text-right text-[14px] font-bold">{value}</span>
    </div>
  );
}

function labelClass(design: CardDesign) {
  if (design.typographyPreset === "LUXURY") return "text-[11px] font-medium uppercase tracking-[0.24em]";
  if (design.typographyPreset === "PLAYFUL") return "text-[12px] font-black uppercase tracking-[0.12em]";
  if (design.typographyPreset === "MINIMAL") return "text-[11px] font-medium uppercase tracking-[0.20em]";
  return "text-[12px] font-semibold uppercase tracking-[0.18em]";
}

function customerClass(design: CardDesign) {
  if (design.typographyPreset === "PREMIUM") return "mt-2 text-[32px] font-black leading-[1.02] tracking-[-0.05em]";
  if (design.typographyPreset === "LUXURY") return "mt-2 text-[28px] font-semibold leading-[1.08] tracking-[0.02em]";
  if (design.typographyPreset === "PLAYFUL") return "mt-2 text-[31px] font-black leading-[1.05]";
  if (design.typographyPreset === "MINIMAL") return "mt-2 text-[28px] font-light leading-[1.12] tracking-[-0.01em]";
  if (design.typographyPreset === "CLASSIC") return "mt-2 text-[30px] font-bold leading-[1.08]";
  return "mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.05em]";
}

function progressClass(design: CardDesign) {
  if (design.typographyPreset === "MINIMAL") return "mt-1 text-[38px] font-light leading-none";
  if (design.typographyPreset === "LUXURY") return "mt-1 text-[40px] font-semibold leading-none tracking-[0.02em]";
  return "mt-1 text-[44px] font-black leading-none tracking-[-0.06em]";
}

function supportingClass(design: CardDesign) {
  if (design.typographyPreset === "MINIMAL") return "mt-2 text-[13px] font-light";
  if (design.typographyPreset === "PREMIUM") return "mt-2 text-[14px] font-semibold";
  return "mt-2 text-[14px]";
}

function cardPaddingClass(design: CardDesign) {
  if (design.layoutStyle === "MINIMAL") return "px-5";
  if (design.layoutStyle === "LUXURY") return "px-7";
  return "";
}

function rewardPanelStyle(design: CardDesign, theme: WalletTheme, rewardReady: boolean) {
  if (rewardReady) {
    return {
      className: "shadow-md",
      style: {
        backgroundColor: "#E9F7EE",
        color: "#14532D",
        borderColor: "rgba(47, 111, 68, 0.28)",
      },
    };
  }
  if (design.rewardStyle === "OUTLINE") {
    return {
      className: "",
      style: {
        backgroundColor: "transparent",
        color: theme.cardText,
        borderColor: theme.badgeBorder,
      },
    };
  }
  if (design.rewardStyle === "GLASS") {
    return {
      className: "backdrop-blur-sm shadow-sm",
      style: {
        backgroundColor: "rgba(255,255,255,0.18)",
        color: theme.cardText,
        borderColor: "rgba(255,255,255,0.30)",
      },
    };
  }
  if (design.rewardStyle === "PREMIUM") {
    return {
      className: "shadow-lg",
      style: {
        backgroundColor: theme.rewardPanelBackground,
        color: theme.rewardPanelText,
        borderColor: theme.accent,
      },
    };
  }
  if (design.rewardStyle === "TICKET") {
    return {
      className: "border-dashed shadow-sm",
      style: {
        backgroundColor: theme.rewardPanelBackground,
        color: theme.rewardPanelText,
        borderColor: theme.rewardPanelBorder,
      },
    };
  }
  return {
    className: "shadow-md",
    style: {
      backgroundColor: theme.rewardPanelBackground,
      color: theme.rewardPanelText,
      borderColor: theme.rewardPanelBorder,
    },
  };
}
