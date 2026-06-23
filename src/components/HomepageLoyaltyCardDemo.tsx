"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Coffee, Gift, QrCode, Sparkles } from "lucide-react";

const maxStamps = 10;
const initialStamps = 8;

export function HomepageLoyaltyCardDemo() {
  const [stamps, setStamps] = useState(initialStamps);
  const isRewardReady = stamps >= maxStamps;
  const progress = useMemo(() => Math.min(100, Math.round((stamps / maxStamps) * 100)), [stamps]);

  function addStamp() {
    setStamps((current) => Math.min(maxStamps, current + 1));
  }

  return (
    <div className="relative rounded-[32px] border border-orange-100 bg-white/85 p-4 shadow-2xl shadow-orange-200/50 backdrop-blur">
      <div className="absolute -left-3 bottom-12 z-10 hidden rotate-[-3deg] rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-xl shadow-orange-200/40 sm:block" aria-hidden="true">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EA580C]">Reward Ready</p>
        <p className="mt-1 text-sm font-semibold text-[#111827]">Free Coffee</p>
      </div>
      <div className="absolute -right-4 -top-5 hidden rounded-full bg-[#FDBA74]/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9A3412] sm:block" aria-hidden="true">
        Live demo
      </div>
      <div className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2A160E] via-[#4A2413] to-[#8B3A12] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#FDBA74] ring-1 ring-white/15">
              <Coffee className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-orange-100">Orange Cafe</p>
              <h2 className="mt-1 truncate text-2xl font-semibold">Mina Hanna</h2>
            </div>
          </div>
          <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase text-orange-100 ring-1 ring-white/15">
            Gold
          </span>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-5 text-[#111827] shadow-xl shadow-black/10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#EA580C]">Stamp progress</p>
              <p className="mt-1 text-4xl font-semibold customer-card-counter" key={stamps}>
                {stamps}/{maxStamps}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
              {isRewardReady ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> : <Gift className="h-7 w-7" aria-hidden="true" />}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-orange-100">
            <div className="customer-card-progress h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-[#64748B]">
            {isRewardReady ? "Free coffee unlocked for this loyal regular." : `${maxStamps - stamps} stamps away from a free coffee.`}
          </p>

          <button
            type="button"
            onClick={addStamp}
            disabled={isRewardReady}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-95 disabled:cursor-default disabled:from-[#16A34A] disabled:to-[#15803D] disabled:shadow-green-100"
          >
            {isRewardReady ? (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Reward Unlocked
              </>
            ) : (
              "Add Stamp (Demo)"
            )}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-100">Next reward</p>
            <p className="mt-1 text-lg font-semibold">Free Coffee</p>
            <p className="mt-1 text-sm text-orange-100/85">Scan QR to earn or redeem.</p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-[#111827]">
            <QrCode className="h-12 w-12" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
