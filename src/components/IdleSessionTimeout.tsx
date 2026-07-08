"use client";

import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["click", "keydown", "mousemove", "scroll", "touchstart"] as const;

export function IdleSessionTimeout() {
  // Explicit `number` (not `ReturnType<typeof window.setTimeout>`): with @types/node's
  // ambient globals in scope, that alias resolves to NodeJS.Timeout even though this
  // client component always runs in the browser, where setTimeout returns a number.
  const timeoutRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const logoutForIdleSession = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      try {
        await fetch("/api/session/idle-logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
      } catch (error) {
        console.error("Idle session logout failed", error);
      } finally {
        window.location.replace("/login?reason=idle-timeout");
      }
    };

    const resetTimer = () => {
      if (loggingOutRef.current) return;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(logoutForIdleSession, IDLE_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, []);

  return null;
}
