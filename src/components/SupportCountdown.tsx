"use client";

import { useEffect, useMemo, useState } from "react";

function getRemainingMs(expiresAt: string) {
  return new Date(expiresAt).getTime() - Date.now();
}

export function formatSupportRemaining(expiresAt: string) {
  const remainingMs = getRemainingMs(expiresAt);

  if (remainingMs <= 0) {
    return "Expired";
  }

  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if (remainingSeconds < 60) {
    return `${remainingSeconds} ${remainingSeconds === 1 ? "second" : "seconds"} remaining`;
  }

  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return `${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"} remaining`;
}

export function SupportCountdown({
  expiresAt,
  supportSessionId,
  redirectOnExpire = false,
}: {
  expiresAt: string;
  supportSessionId?: number;
  redirectOnExpire?: boolean;
}) {
  const [remainingLabel, setRemainingLabel] = useState(() => formatSupportRemaining(expiresAt));
  const expiredUrl = useMemo(() => {
    const params = supportSessionId ? `?supportSessionId=${supportSessionId}` : "";
    return `/support-session/expired${params}`;
  }, [supportSessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextLabel = formatSupportRemaining(expiresAt);
      setRemainingLabel(nextLabel);

      if (redirectOnExpire && nextLabel === "Expired") {
        window.location.assign(expiredUrl);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiredUrl, expiresAt, redirectOnExpire]);

  return <span>{remainingLabel}</span>;
}
