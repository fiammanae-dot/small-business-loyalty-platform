"use client";

import { useEffect } from "react";
import { playScannerSound, type ScannerSoundEvent, unlockScannerAudio } from "@/lib/scanner-sounds";

type ScannerSoundFeedbackProps = {
  event: ScannerSoundEvent | null;
  enabled?: boolean;
};

export function ScannerSoundFeedback({ event, enabled = true }: ScannerSoundFeedbackProps) {
  useEffect(() => {
    if (!event || !enabled || typeof window === "undefined") return;

    // Narrowed copy: the nested function declaration below doesn't retain the
    // `!event` narrowing from this guard, since TS re-widens closed-over
    // variables inside nested function bodies.
    const activeEvent = event;
    let cancelled = false;

    async function playAfterAllowed() {
      const played = await playScannerSound(activeEvent, enabled);
      if (played || cancelled) return;

      const playOnGesture = async () => {
        if (cancelled) return;
        await unlockScannerAudio();
        await playScannerSound(activeEvent, enabled);
        removeGestureListeners();
      };

      const removeGestureListeners = () => {
        window.removeEventListener("pointerdown", playOnGesture);
        window.removeEventListener("keydown", playOnGesture);
        window.removeEventListener("touchstart", playOnGesture);
      };

      window.addEventListener("pointerdown", playOnGesture, { once: true });
      window.addEventListener("keydown", playOnGesture, { once: true });
      window.addEventListener("touchstart", playOnGesture, { once: true });
    }

    void playAfterAllowed().catch((error) => {
      console.warn("Loyalty Card UAE scanner sound error", error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, event]);

  return null;
}
