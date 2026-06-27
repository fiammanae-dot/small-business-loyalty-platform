"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SupportActivityTracker({ supportSessionId }: { supportSessionId: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const path = queryString ? `${pathname}?${queryString}` : pathname;

    void fetch("/support-session/activity", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supportSessionId, path }),
      keepalive: true,
    }).catch(() => {
      // Support activity logging must never interrupt workspace navigation.
    });
  }, [pathname, searchParams, supportSessionId]);

  return null;
}
