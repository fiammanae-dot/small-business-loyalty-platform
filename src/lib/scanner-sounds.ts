export type ScannerSoundEvent = "valid" | "invalid" | "stamp-added";

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;
let audioUnlocked = false;
let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

export async function unlockScannerAudio() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === "suspended") {
      await context.resume();
    }
    audioUnlocked = true;
    return true;
  } catch (error) {
    console.warn("Loyalty Card UAE scanner sound error", error);
    return false;
  }
}

export function stopScannerSound() {
  for (const oscillator of activeOscillators) {
    try {
      oscillator.stop();
    } catch {
      // Oscillator may have already completed.
    }
  }
  for (const gain of activeGains) {
    try {
      gain.disconnect();
    } catch {
      // Gain may have already disconnected.
    }
  }
  activeOscillators = [];
  activeGains = [];
}

export async function playScannerSound(event: ScannerSoundEvent, enabled = true) {
  if (!enabled) return false;
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (!audioUnlocked) {
      if (context.state === "suspended") return false;
      audioUnlocked = true;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    stopScannerSound();
    const start = context.currentTime + 0.01;

    if (event === "valid") {
      scannerValidSound(context, start);
    } else if (event === "invalid") {
      scannerInvalidSound(context, start);
    } else {
      stampAddedSound(context, start);
    }

    window.setTimeout(stopScannerSound, 900);
    return true;
  } catch (error) {
    console.warn("Loyalty Card UAE scanner sound error", error);
    stopScannerSound();
    return false;
  }
}

export function scannerValidSound(context: AudioContext, start: number) {
  playTone(context, 1046.5, start, 0.08, "sine", 0.16);
  playTone(context, 1318.5, start + 0.08, 0.1, "sine", 0.15);
}

export function scannerInvalidSound(context: AudioContext, start: number) {
  playTone(context, 220, start, 0.13, "sawtooth", 0.15);
  playTone(context, 164.8, start + 0.12, 0.16, "sawtooth", 0.13);
}

export function stampAddedSound(context: AudioContext, start: number) {
  playTone(context, 783.99, start, 0.08, "triangle", 0.17);
  playTone(context, 1046.5, start + 0.08, 0.1, "sine", 0.18);
  playTone(context, 1567.98, start + 0.18, 0.18, "sine", 0.16);
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
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);

  activeOscillators.push(oscillator);
  activeGains.push(gain);

  oscillator.addEventListener("ended", () => {
    activeOscillators = activeOscillators.filter((node) => node !== oscillator);
    activeGains = activeGains.filter((node) => node !== gain);
    try {
      gain.disconnect();
    } catch {
      // Already disconnected.
    }
  });
}
