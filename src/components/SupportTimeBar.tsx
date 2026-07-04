"use client";

import { useEffect, useState } from "react";

function getElapsedPercent(startedAt: string, expiresAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(expiresAt).getTime();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
}

export function SupportTimeBar({ startedAt, expiresAt }: { startedAt: string; expiresAt: string }) {
  const [percent, setPercent] = useState(() => getElapsedPercent(startedAt, expiresAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPercent(getElapsedPercent(startedAt, expiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt, expiresAt]);

  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-[var(--light-gray)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Session time elapsed"
    >
      <div
        className="h-full rounded-full bg-[#E24B4A] transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
