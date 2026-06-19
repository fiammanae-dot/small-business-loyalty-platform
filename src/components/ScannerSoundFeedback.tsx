"use client";

import { useEffect } from "react";

type ScannerSoundEvent = "success" | "error" | "reward";

type ScannerSoundFeedbackProps = {
  event: ScannerSoundEvent | null;
  enabled?: boolean;
};

export function ScannerSoundFeedback({ event, enabled = true }: ScannerSoundFeedbackProps) {
  useEffect(() => {
    if (!event || !enabled || typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    let context: AudioContext | null = null;

    try {
      context = new AudioContextClass();
      const start = context.currentTime;

      if (event === "success") {
        playTone(context, 880, start, 0.09, "sine", 0.08);
      } else if (event === "error") {
        playTone(context, 180, start, 0.12, "sawtooth", 0.07);
        playTone(context, 140, start + 0.13, 0.12, "sawtooth", 0.06);
      } else {
        playTone(context, 660, start, 0.08, "sine", 0.07);
        playTone(context, 880, start + 0.09, 0.08, "sine", 0.07);
        playTone(context, 1175, start + 0.18, 0.14, "sine", 0.08);
      }

      window.setTimeout(() => {
        void context?.close().catch(() => undefined);
      }, 600);
    } catch (error) {
      console.warn("LoyaltyBase scanner sound error", error);
      void context?.close().catch(() => undefined);
    }
  }, [enabled, event]);

  return null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function playTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
