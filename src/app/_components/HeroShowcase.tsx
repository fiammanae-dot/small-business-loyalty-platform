"use client";

import { Car, Coffee, Gift, QrCode, Scissors, Sparkles, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Sector = {
  name: string;
  tag: string;
  Icon: LucideIcon;
  Stamp: LucideIcon;
  reward: string;
  sub: string;
};

const SECTORS: Sector[] = [
  { name: "SHARP CUTS", tag: "Barbershop", Icon: Scissors, Stamp: Scissors, reward: "Free cut", sub: "Show this at Sharp Cuts to redeem" },
  { name: "LUNA SALON", tag: "Beauty salon", Icon: Sparkles, Stamp: Sparkles, reward: "Free blow-dry", sub: "Show this at Luna Salon to redeem" },
  { name: "SHINE WASH", tag: "Car wash", Icon: Car, Stamp: Car, reward: "Free wash", sub: "Show this at Shine Wash to redeem" },
  { name: "PROPER GRILL", tag: "Restaurant", Icon: Utensils, Stamp: Utensils, reward: "Free meal", sub: "Show this at Proper Grill to redeem" },
];

const TOTAL_VISITS = 8;

function useQrMatrix() {
  return useMemo(() => {
    const size = 21;
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
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

    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const inFinder = (row <= 7 && col <= 7) || (row <= 7 && col >= size - 8) || (row >= size - 8 && col <= 7);
        if (inFinder || row === 6 || col === 6) continue;
        grid[row][col] = random() > 0.52 ? 1 : 0;
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
    const clearTimers = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const interval = setInterval(() => {
      setFilled((current) => {
        if (current + 1 >= TOTAL_VISITS) {
          clearInterval(interval);
          const rewardTimer = setTimeout(() => {
            if (!mounted) return;
            setReward(true);
            const nextTimer = setTimeout(() => {
              if (!mounted) return;
              setReward(false);
              setFilled(4);
              setSector((value) => (value + 1) % SECTORS.length);
            }, 2200);
            timers.current.push(nextTimer);
          }, 550);
          timers.current.push(rewardTimer);
          return TOTAL_VISITS;
        }
        return current + 1;
      });
    }, 520);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimers();
    };
  }, [sector]);

  const currentSector = SECTORS[sector];
  const remaining = TOTAL_VISITS - filled;
  const progressText = remaining > 0 ? `${remaining} ${remaining === 1 ? "visit" : "visits"} until your reward` : "Reward unlocked";
  const CurrentIcon = currentSector.Icon;
  const CurrentStamp = currentSector.Stamp;

  return (
    <div className="relative mx-auto h-[620px] w-full max-w-[620px] overflow-hidden lg:h-[640px] lg:overflow-visible" aria-label="Animated Loyalty Card UAE customer card preview">
      <style>{`
        @keyframes scanLine { 0% { top: 18%; } 50% { top: 78%; } 100% { top: 18%; } }
        @keyframes rewardPop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="absolute left-0 top-20 z-30 hidden w-[240px] rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_24px_50px_-20px_rgba(30,41,59,0.18)] lg:block">
        <div className="mb-1.5 text-base font-extrabold text-slate-800">Scan. Earn. Enjoy.</div>
        <div className="mb-3.5 text-[13px] leading-relaxed text-slate-500">Earn a visit in seconds. Staff scan the QR code at checkout.</div>
        <div className="relative flex h-[104px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800">
          <QrGrid cells={qr} className="h-[72px] w-[72px] rounded-lg bg-white p-1.5" />
          <div className="absolute left-[14%] right-[14%] h-0.5 bg-orange-400 shadow-[0_0_10px_2px_rgba(251,146,60,0.7)]" style={{ animation: "scanLine 2.4s ease-in-out infinite" }} />
        </div>
      </div>

      <div className="absolute bottom-20 left-3 z-30 hidden w-[230px] rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_24px_50px_-20px_rgba(30,41,59,0.18)] lg:block">
        <div className="mb-1.5 text-base font-extrabold text-slate-800">Reward yourself</div>
        <div className="mb-3.5 text-[13px] leading-relaxed text-slate-500">Hit the visit goal and redeem a reward at the counter.</div>
        <div className="relative flex h-[104px] items-center gap-3.5 overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 px-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_8px_18px_-4px_rgba(249,115,22,0.5)]">
            <Gift className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-slate-800">Free reward unlocked</div>
            <div className="text-xs font-semibold text-orange-700">Redeem on your next visit</div>
          </div>
          <div className="absolute -bottom-3.5 -right-3.5 h-[60px] w-[60px] rounded-full bg-orange-500/[0.14]" />
        </div>
      </div>

      <div className="absolute left-1/2 top-3 z-20 h-[596px] w-[292px] -translate-x-1/2 rounded-[44px] bg-slate-900 p-[10px] shadow-[0_40px_80px_-30px_rgba(15,23,42,0.5)] lg:left-[300px] lg:translate-x-0">
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-white">
          <div className="flex items-center justify-between px-[22px] pb-1.5 pt-3.5 text-[13px] font-bold">
            <span>9:41</span>
            <div className="absolute left-1/2 top-[11px] h-[22px] w-20 -translate-x-1/2 rounded-full bg-slate-900" />
            <span className="tracking-wide">LTE</span>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-100">
                <BellIcon />
              </div>
            </div>

            <div className="relative mb-3 overflow-hidden rounded-[18px] bg-slate-900 p-4 text-white">
              <div className="mb-3.5 flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-extrabold tracking-wide">{currentSector.name}</div>
                  <div className="text-[11px] text-slate-400">{currentSector.tag}</div>
                </div>
                <CurrentIcon className="h-5 w-5 text-orange-300" aria-hidden="true" />
              </div>
              <div className="mb-3 flex gap-[5px]">
                {Array.from({ length: TOTAL_VISITS }).map((_, index) => {
                  const active = index < filled;
                  const pop = active && index === filled - 1 && !reward;
                  return (
                    <div
                      key={index}
                      className="flex aspect-square flex-1 items-center justify-center rounded-full transition-all duration-300"
                      style={{
                        background: active ? "#F97316" : "#1E293B",
                        color: active ? "#fff" : "#CBD5E1",
                        transform: pop ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      {active ? <CurrentStamp className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{filled} of {TOTAL_VISITS} visits</span>
                <span className="font-bold text-orange-400">{currentSector.reward}</span>
              </div>

              {reward ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 p-3.5 text-center" style={{ animation: "rewardPop .35s ease both" }}>
                  <Gift className="h-8 w-8 text-white" aria-hidden="true" />
                  <div className="mt-1.5 text-[15px] font-extrabold text-white">Your reward is ready!</div>
                  <div className="mt-0.5 text-[11px] text-orange-100">{currentSector.sub}</div>
                </div>
              ) : null}
            </div>

            <div className="mb-3 flex items-center gap-3 rounded-[14px] border border-slate-100 px-3.5 py-3">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-slate-900 text-white">
                <QrCode className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">Scan in-store</div>
                <div className="text-[11px] text-slate-400">Show this code to earn a visit</div>
              </div>
              <span className="text-slate-300">&gt;</span>
            </div>

            <div className="rounded-[14px] border border-slate-100 p-3.5">
              <div className="mb-2.5 flex justify-between">
                <span className="text-[13px] font-bold">Your progress</span>
                <span className="text-xs font-bold text-orange-500">View history</span>
              </div>
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>{progressText}</span>
                <span className="font-bold text-slate-800">{filled}/{TOTAL_VISITS}</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${Math.round((filled / TOTAL_VISITS) * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-slate-100 bg-white px-3.5">
            <PhoneNavItem active label="Home" icon={<Coffee className="h-4 w-4" />} />
            <PhoneNavItem label="Rewards" icon={<Gift className="h-4 w-4" />} />
            <div className="-mt-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-orange-500 text-white shadow-[0_8px_18px_-4px_rgba(249,115,22,0.6)]">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </div>
            <PhoneNavItem label="Wallet" icon={<CreditCardIcon />} />
            <PhoneNavItem label="Account" icon={<UserIcon />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QrGrid({ cells, className }: { cells: number[]; className: string }) {
  return (
    <div className={`grid grid-cols-[repeat(21,1fr)] grid-rows-[repeat(21,1fr)] ${className}`} aria-hidden="true">
      {cells.map((value, index) => (
        <div key={index} style={{ background: value ? "#0F172A" : "transparent" }} />
      ))}
    </div>
  );
}

function PhoneNavItem({ label, icon, active = false }: { label: string; icon: ReactNode; active?: boolean }) {
  return (
    <div className={`text-center ${active ? "text-orange-500" : "text-slate-400"}`}>
      <div className="flex justify-center">{icon}</div>
      <div className="mt-0.5 text-[9px] font-bold">{label}</div>
    </div>
  );
}

function BellIcon() {
  return <span className="block h-3.5 w-3.5 rounded-full border-2 border-slate-500 border-t-transparent" aria-hidden="true" />;
}

function CreditCardIcon() {
  return <span className="block h-3.5 w-4 rounded-[3px] border-2 border-current" aria-hidden="true" />;
}

function UserIcon() {
  return <span className="block h-4 w-4 rounded-full border-2 border-current" aria-hidden="true" />;
}
