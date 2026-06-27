import Image from "next/image";
import type { WalletTheme } from "@/components/public-card/WalletCardShell";
import { withAlpha } from "@/lib/card-themes";

export type ProgramRewardCardProps = {
  programName: string;
  rewardName: string;
  qrCode: string;
  progress: number;
  required: number;
  remaining: number;
  completion: number;
  rewardReady: boolean;
  theme: WalletTheme;
};

export function ProgramRewardCard({
  programName,
  rewardName,
  qrCode,
  progress,
  required,
  remaining,
  completion,
  rewardReady,
  theme,
}: ProgramRewardCardProps) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: withAlpha(theme.accent, 0.18), backgroundColor: withAlpha(theme.accent, 0.03) }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#111827]">{programName}</p>
          <p className="mt-1 text-sm text-[#6B7280]">Reward: {rewardName}</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={rewardReady ? { backgroundColor: "#DCFCE7", color: "#15803D" } : { backgroundColor: withAlpha(theme.accent, 0.1), color: theme.accent }}
        >
          {rewardReady ? "Ready" : `${remaining} left`}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <p className="text-2xl font-bold text-[#111827]">{progress}/{required}</p>
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: theme.progressTrack }}>
          <div className="h-full rounded-full" style={{ width: `${completion}%`, background: theme.progressFill }} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FAFAFA] p-3">
        <Image src={qrCode} alt={`${programName} scan QR`} width={84} height={84} unoptimized />
        <p className="text-sm font-medium text-[#111827]">
          {rewardReady ? "Show to redeem this reward." : "Show to earn stamps for this program."}
        </p>
      </div>
    </div>
  );
}
