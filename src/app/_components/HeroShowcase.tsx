"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Sector = {
  name: string;
  tag: string;
  icon: string;
  stamp: string;
  reward: string;
  sub: string;
};

const SECTORS: Sector[] = [
  { name: "SHARP CUTS", tag: "Barbershop", icon: "✂️", stamp: "✂️", reward: "Free cut", sub: "Show this at Sharp Cuts to redeem" },
  { name: "LUNA SALON", tag: "Beauty Salon", icon: "🌸", stamp: "🌸", reward: "Free blow-dry", sub: "Show this at Luna Salon to redeem" },
  { name: "SHINE WASH", tag: "Car Wash", icon: "🚗", stamp: "💧", reward: "Free wash", sub: "Show this at Shine Wash to redeem" },
  { name: "PROPER PIZZA", tag: "Restaurant", icon: "🍕", stamp: "🍕", reward: "Free meal", sub: "Show this at Proper Pizza to redeem" },
];

const TOTAL = 8;

function useQrMatrix() {
  return useMemo(() => {
    const size = 21;
    const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    const finder = (row: number, col: number) => {
      for (let i = -1; i <= 7; i += 1) {
        for (let j = -1; j <= 7; j += 1) {
          const r = row + i;
          const c = col + j;
          if (r < 0 || c < 0 || r >= size || c >= size) continue;
          const edge = (i === 0 || i === 6) && j >= 0 && j <= 6;
          const side = (j === 0 || j === 6) && i >= 0 && i <= 6;
          const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          grid[r][c] = edge || side || core ? 1 : 0;
        }
      }
    };

    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);

    for (let i = 8; i < size - 8; i += 1) {
      grid[6][i] = i % 2 === 0 ? 1 : 0;
      grid[i][6] = i % 2 === 0 ? 1 : 0;
    }

    const align = size - 9;
    for (let i = -2; i <= 2; i += 1) {
      for (let j = -2; j <= 2; j += 1) {
        grid[align + i][align + j] = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0) ? 1 : 0;
      }
    }

    const inFinder = (r: number, c: number) => (r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7);
    const inAlign = (r: number, c: number) => r >= align - 2 && r <= align + 2 && c >= align - 2 && c <= align + 2;
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (inFinder(r, c) || inAlign(r, c) || r === 6 || c === 6) continue;
        grid[r][c] = random() > 0.5 ? 1 : 0;
      }
    }

    return grid.flat();
  }, []);
}

export default function HeroShowcase() {
  const [sector, setSector] = useState(0);
  const [filled, setFilled] = useState(4);
  const [reward, setReward] = useState(false);
  const qr = useQrMatrix();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let mounted = true;
    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const runReward = () => {
      const rewardTimer = setTimeout(() => {
        if (!mounted) return;
        setReward(true);
        const resetTimer = setTimeout(() => {
          if (!mounted) return;
          setReward(false);
          setFilled(4);
          setSector((current) => (current + 1) % SECTORS.length);
        }, 2200);
        timers.current.push(resetTimer);
      }, 550);
      timers.current.push(rewardTimer);
    };
    const interval = setInterval(() => {
      setFilled((current) => {
        if (current + 1 >= TOTAL) {
          clearInterval(interval);
          runReward();
          return TOTAL;
        }
        return current + 1;
      });
    }, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearAll();
    };
  }, [sector]);

  const activeSector = SECTORS[sector];
  const remaining = TOTAL - filled;
  const progressText = remaining > 0 ? `${remaining} ${remaining === 1 ? "visit" : "visits"} until your reward` : "Reward unlocked!";

  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[640px] sm:h-[640px]">
      <style>{`
        @keyframes scanLine { 0% { top: 18%; } 50% { top: 78%; } 100% { top: 18%; } }
        @keyframes rewardPop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="absolute left-0 top-[92px] z-30 hidden w-[240px] rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_24px_50px_-20px_rgba(30,41,59,0.18)] lg:block">
        <div className="mb-1.5 text-base font-extrabold text-slate-800">Scan. Earn. Enjoy.</div>
        <div className="mb-3.5 text-[13px] leading-relaxed text-slate-500">Earn a visit in seconds. Just scan the QR code at checkout.</div>
        <div className="relative flex h-[104px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="grid h-[72px] w-[72px] grid-cols-[repeat(21,1fr)] grid-rows-[repeat(21,1fr)] rounded-lg bg-white p-1.5">
            {qr.map((value, index) => (
              <div key={index} style={{ background: value ? "#0F172A" : "transparent" }} />
            ))}
          </div>
          <div className="absolute left-[14%] right-[14%] h-0.5 bg-orange-400 shadow-[0_0_10px_2px_rgba(251,146,60,0.7)]" style={{ animation: "scanLine 2.4s ease-in-out infinite" }} />
          <span className="absolute left-2 top-2 h-3.5 w-3.5 rounded-tl-[3px] border-l-2 border-t-2 border-orange-400" />
          <span className="absolute right-2 top-2 h-3.5 w-3.5 rounded-tr-[3px] border-r-2 border-t-2 border-orange-400" />
          <span className="absolute bottom-2 left-2 h-3.5 w-3.5 rounded-bl-[3px] border-b-2 border-l-2 border-orange-400" />
          <span className="absolute bottom-2 right-2 h-3.5 w-3.5 rounded-br-[3px] border-b-2 border-r-2 border-orange-400" />
        </div>
      </div>

      <div className="absolute bottom-12 left-2 z-30 hidden w-[230px] rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_24px_50px_-20px_rgba(30,41,59,0.18)] lg:block">
        <div className="mb-1.5 text-base font-extrabold text-slate-800">Reward yourself</div>
        <div className="mb-3.5 text-[13px] leading-relaxed text-slate-500">Hit your visit goal and redeem exclusive rewards and offers.</div>
        <div className="relative flex h-[104px] items-center gap-3.5 overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 px-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-orange-500 text-[26px] shadow-[0_8px_18px_-4px_rgba(249,115,22,0.5)]">🎁</div>
          <div>
            <div className="text-[15px] font-extrabold text-slate-800">Free reward unlocked</div>
            <div className="text-xs font-semibold text-orange-700">Redeem on your next visit</div>
          </div>
          <div className="absolute -bottom-3.5 -right-3.5 h-[60px] w-[60px] rounded-full bg-orange-500/[0.14]" />
        </div>
      </div>

      <div className="absolute left-1/2 top-2 z-20 h-[540px] w-[280px] -translate-x-1/2 rounded-[44px] bg-slate-900 p-[11px] shadow-[0_40px_80px_-30px_rgba(15,23,42,0.5)] sm:h-[614px] sm:w-[300px] lg:left-[290px] lg:translate-x-0">
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-white">
          <div className="flex items-center justify-between px-[22px] pb-1.5 pt-3.5 text-[13px] font-bold">
            <span>9:41</span>
            <div className="absolute left-1/2 top-[11px] h-[22px] w-20 -translate-x-1/2 rounded-full bg-slate-900" />
            <span className="tracking-widest">5G</span>
          </div>

          <div className="px-5 pt-3">
            <div className="mb-3.5 flex items-start justify-between">
              <div>
                <div className="mb-1 text-[13px] text-slate-500">Good morning, Alex</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-black tracking-tight">18</span>
                  <span className="text-[13px] font-semibold text-slate-500">Visits</span>
                </div>
                <div className="text-xs text-slate-400">3 rewards earned</div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-100">•</div>
            </div>

            <div className="relative mb-3 overflow-hidden rounded-[18px] bg-slate-900 p-4 text-white">
              <div className="mb-3.5 flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-extrabold tracking-wide">{activeSector.name}</div>
                  <div className="text-[11px] text-slate-400">{activeSector.tag}</div>
                </div>
                <span className="text-lg">{activeSector.icon}</span>
              </div>
              <div className="mb-3 flex gap-[5px]">
                {Array.from({ length: TOTAL }).map((_, index) => {
                  const active = index < filled;
                  const pop = active && index === filled - 1 && !reward;
                  return (
                    <div
                      key={index}
                      className="flex aspect-square flex-1 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300"
                      style={{
                        background: active ? "#F97316" : "#1E293B",
                        color: active ? "#fff" : "#CBD5E1",
                        transform: pop ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      {active ? activeSector.stamp : index + 1}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{filled} of {TOTAL} visits</span>
                <span className="font-bold text-orange-400">{activeSector.reward}</span>
              </div>

              {reward ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 p-3.5 text-center" style={{ animation: "rewardPop .35s ease both" }}>
                  <div className="text-[28px] leading-none">🎉</div>
                  <div className="mt-1.5 text-[15px] font-extrabold text-white">Your reward is ready!</div>
                  <div className="mt-0.5 text-[11px] text-orange-100">{activeSector.sub}</div>
                </div>
              ) : null}
            </div>

            <div className="mb-3 flex items-center gap-3 rounded-[14px] border border-slate-100 px-3.5 py-3">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-slate-900 text-base text-white">▦</div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">Scan in-store</div>
                <div className="text-[11px] text-slate-400">Show this code to earn a visit</div>
              </div>
              <span className="text-slate-300">›</span>
            </div>

            <div className="rounded-[14px] border border-slate-100 p-3.5">
              <div className="mb-2.5 flex justify-between">
                <span className="text-[13px] font-bold">Your progress</span>
                <span className="text-xs font-bold text-orange-500">View history</span>
              </div>
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>{progressText}</span>
                <span className="font-bold text-slate-800">{filled}/{TOTAL}</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${Math.round((filled / TOTAL) * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-slate-100 bg-white px-3.5">
            <div className="text-center text-orange-500">
              <div className="text-base">⌂</div>
              <div className="text-[9px] font-bold">Home</div>
            </div>
            <div className="text-center text-slate-400">
              <div className="text-base">🎁</div>
              <div className="text-[9px]">Rewards</div>
            </div>
            <div className="-mt-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-orange-500 text-xl text-white shadow-[0_8px_18px_-4px_rgba(249,115,22,0.6)]">▦</div>
            <div className="text-center text-slate-400">
              <div className="text-base">▤</div>
              <div className="text-[9px]">Wallet</div>
            </div>
            <div className="text-center text-slate-400">
              <div className="text-base">○</div>
              <div className="text-[9px]">Account</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
