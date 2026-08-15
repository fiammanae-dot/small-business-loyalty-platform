import { Sparkles } from "lucide-react";
import type { WalletTheme } from "@/components/public-card/WalletCardShell";
import { withAlpha } from "@/lib/card-themes";

export type TierStatusPanelProps = {
  badgeLabel: string;
  badgeIcon: string;
  isVip: boolean;
  nextTier?: string | null;
  visitsRemaining: number;
  progressPercent: number;
  theme: WalletTheme;
  maintainThreshold?: number;
  windowedVisits?: number;
  expiresAt?: string | null;
  isPermanent?: boolean;
  windowLabel?: string | null;
};

export function TierStatusPanel({
  badgeLabel,
  badgeIcon,
  isVip,
  nextTier,
  visitsRemaining,
  progressPercent,
  theme,
  maintainThreshold = 0,
  windowedVisits = 0,
  expiresAt = null,
  isPermanent = false,
  windowLabel = null,
}: TierStatusPanelProps) {
  const tone = getTierTone(badgeLabel, theme);
  const tierName = badgeLabel.replace(/\s*MEMBER$/i, "");

  // Bronze has no requirement to hold on to, so it shows neither a validity
  // line nor a maintain card.
  const hasTierToMaintain = maintainThreshold > 0;
  const validUntil = expiresAt ? formatStatusDate(expiresAt) : null;
  const maintainProgress = hasTierToMaintain
    ? Math.round((Math.min(windowedVisits, maintainThreshold) / maintainThreshold) * 100)
    : 0;
  const isMaintained = windowedVisits >= maintainThreshold;
  // "Last 90 days" reads badly after "in the last", so drop the prefix.
  const windowPhrase = windowLabel ? windowLabel.replace(/^Last\s+/i, "").toLowerCase() : null;

  return (
    <section className="rounded-[28px] border p-5 shadow-sm" style={{ borderColor: tone.border, background: tone.background }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: tone.label }}>Customer tier</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: tone.iconBackground, color: tone.iconColor }} aria-hidden="true">
              {badgeIcon}
            </span>
            <div>
              <h2 className="text-2xl font-black text-[#1E293B]">{badgeLabel}</h2>
              {isVip ? <p className="mt-1 text-sm font-bold text-yellow-700">Exclusive Rewards Available</p> : null}
              {hasTierToMaintain && validUntil ? (
                <p className="mt-1 text-sm font-semibold" style={{ color: tone.label }}>
                  Status valid until {validUntil}
                </p>
              ) : null}
              {hasTierToMaintain && !validUntil && isPermanent ? (
                <p className="mt-1 text-sm font-semibold" style={{ color: tone.label }}>
                  Permanent status
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Sparkles className="h-6 w-6" style={{ color: tone.sparkle }} aria-hidden="true" />
      </div>

      {hasTierToMaintain ? (
        <div className="mt-5 rounded-3xl bg-white/80 p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#64748B]">
            <span>Maintain {tierName}</span>
            <span>
              {windowedVisits}/{maintainThreshold}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full" style={{ backgroundColor: theme.progressTrack }}>
            <div className="h-full rounded-full" style={{ width: `${maintainProgress}%`, background: theme.progressFill }} />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#64748B]">
            {windowedVisits} of {maintainThreshold} visit{maintainThreshold === 1 ? "" : "s"}
            {windowPhrase ? ` in the last ${windowPhrase}` : ""}
            {isMaintained
              ? ` — you are set to stay ${tierName}${validUntil ? ` until ${validUntil}` : ""}.`
              : ` — keep ${maintainThreshold} to stay ${tierName}.`}
          </p>
        </div>
      ) : null}

      {!isVip && nextTier ? (
        <div className="mt-4 rounded-3xl bg-white/80 p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#64748B]">
            <span>Upgrade to</span>
            <span>{nextTier}</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full" style={{ backgroundColor: theme.progressTrack }}>
            <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, background: theme.progressFill }} />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#64748B]">
            {visitsRemaining} visit{visitsRemaining === 1 ? "" : "s"} until {nextTier}.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-3xl bg-[#1E293B] p-4 text-white">
          <p className="text-sm font-bold">Top tier member</p>
          <p className="mt-1 text-sm text-white/75">You are already at the highest Loyalty Card UAE tier.</p>
        </div>
      )}
    </section>
  );
}

function formatStatusDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function getTierTone(label: string, theme: WalletTheme) {
  const normalized = label.toUpperCase();
  if (normalized.includes("VIP")) {
    return {
      border: "#FDE68A",
      background: "linear-gradient(135deg, #FEFCE8, #FFFFFF, #FFF7ED)",
      iconBackground: "#1E293B",
      iconColor: "#FDE68A",
      label: "#A16207",
      sparkle: "#EAB308",
    };
  }
  if (normalized.includes("GOLD")) {
    return {
      border: "#FDE68A",
      background: "#FEFCE8",
      iconBackground: "#FEF3C7",
      iconColor: "#A16207",
      label: "#A16207",
      sparkle: "#EAB308",
    };
  }
  if (normalized.includes("SILVER")) {
    return {
      border: "#CBD5E1",
      background: "#F8FAFC",
      iconBackground: "#E2E8F0",
      iconColor: "#475569",
      label: "#64748B",
      sparkle: "#64748B",
    };
  }

  return {
    border: withAlpha(theme.accent, 0.18),
    background: withAlpha(theme.accent, 0.06),
    iconBackground: withAlpha(theme.accent, 0.12),
    iconColor: theme.accent,
    label: theme.text,
    sparkle: theme.accent,
  };
}
