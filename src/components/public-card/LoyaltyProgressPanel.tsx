import type { WalletTheme } from "@/components/public-card/WalletCardShell";

export type LoyaltyProgressPanelProps = {
  programName: string;
  rewardName: string;
  progress: number;
  required: number;
  remaining: number;
  completion: number;
  rewardReady: boolean;
  theme: WalletTheme;
};

export function LoyaltyProgressPanel({
  programName,
  rewardName,
  progress,
  required,
  remaining,
  completion,
  rewardReady,
  theme,
}: LoyaltyProgressPanelProps) {
  return (
    <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: theme.text }}>Loyalty Progress</p>
          <h2 className="mt-2 text-2xl font-black text-[#1E293B]">{programName}</h2>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={rewardReady ? { backgroundColor: "#DCFCE7", color: "#15803D" } : { backgroundColor: theme.surface, color: theme.accent }}
        >
          {rewardReady ? "Complete" : `${remaining} left`}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <div className="mt-2 flex items-end gap-2">
            <p className="customer-card-counter text-6xl font-black tracking-tight" style={{ color: theme.accent }}>{progress}</p>
            <p className="pb-3 text-lg font-black text-[#94A3B8]">/{required}</p>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">Visits Completed</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
            <span>Next Reward</span>
            <span className="text-right">{rewardReady ? "Reward Ready" : rewardName}</span>
          </div>
          <div className="mt-3 h-4 overflow-hidden rounded-full" style={{ backgroundColor: theme.progressTrack }}>
            <div className="customer-card-progress h-full rounded-full" style={{ width: `${completion}%`, background: theme.progressFill }} />
          </div>
          <div className="mt-4 rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-2xl font-black text-[#1E293B]">{progress} / {required} Visits</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              {remaining === 0 ? "Reward ready" : `${remaining} Visit${remaining === 1 ? "" : "s"} Remaining`}
            </p>
            <p className="mt-3 text-sm font-semibold" style={{ color: theme.secondary }}>Next Reward: {rewardName}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
