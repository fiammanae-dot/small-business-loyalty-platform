"use client";

import { Camera, CheckCircle2, ClipboardType, RotateCcw, ShieldAlert, Square, Video, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type ScannerState =
  | "idle"
  | "permission-pending"
  | "camera-active"
  | "camera-blocked"
  | "barcode-unsupported"
  | "no-camera"
  | "manual-fallback"
  | "scan-detected"
  | "scan-failed";

function extractToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { token: "", reason: "Invalid loyalty QR code." };

  if (/^scan_[A-Za-z0-9_-]+$/.test(trimmed)) return { token: trimmed, reason: "" };

  try {
    const url = new URL(trimmed, window.location.origin);
    const parts = url.pathname.split("/").filter(Boolean);
    const scanIndex = parts.indexOf("scan");
    const token = scanIndex >= 0 ? parts[scanIndex + 1] : "";
    if (token && /^[A-Za-z0-9_-]+$/.test(token)) return { token, reason: "" };
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { token: "", reason: "This QR code is not a LoyaltyBase customer card." };
    }
  } catch {
    // Continue to direct token fallback.
  }

  if (/^[A-Za-z0-9_-]{3,160}$/.test(trimmed)) return { token: trimmed, reason: "" };
  return { token: "", reason: "Invalid loyalty QR code." };
}

export function CameraScanner({ backHref }: { backHref: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<InstanceType<BarcodeDetectorConstructor> | null>(null);
  const animationRef = useRef<number | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
    setIsCameraOpen(false);
    setScannerState("manual-fallback");
  }

  function redirectFromValue(value: string) {
    const result = extractToken(value);
    if (!result.token) {
      setScannerState("scan-failed");
      setMessage(result.reason);
      return;
    }

    setScannerState("scan-detected");
    stopCamera();
    router.push(`/scan/${encodeURIComponent(result.token)}`);
  }

  function isLocalOrSecure() {
    return window.isSecureContext || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  }

  function describeCameraError(error: unknown) {
    console.warn("LoyaltyBase scanner camera error", error);
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError" || error.name === "SecurityError") {
        return {
          state: "camera-blocked" as ScannerState,
          message: "Camera access is required to scan customer cards. You can still paste the scan token manually.",
        };
      }
      if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        return {
          state: "no-camera" as ScannerState,
          message: "No camera was found on this device. Paste the scan token or customer card link below.",
        };
      }
    }
    return {
      state: "scan-failed" as ScannerState,
      message: "Scanner could not start. Paste the scan token or customer card link below.",
    };
  }

  async function openCameraPreview(nextFacingMode = facingMode) {
    setMessage("");
    setScannerState("permission-pending");

    if (!isLocalOrSecure()) {
      setScannerState("camera-blocked");
      setMessage("Camera scanning requires HTTPS or localhost. Paste the scan token or customer card link below.");
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerState("no-camera");
      setMessage("This browser cannot access a camera. Paste the scan token or customer card link below.");
      return false;
    }

    try {
      stopCamera();
      setScannerState("permission-pending");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOpen(true);
      setScannerState("camera-active");
      return true;
    } catch (error) {
      const diagnosis = describeCameraError(error);
      setScannerState(diagnosis.state);
      setMessage(diagnosis.message);
      stopCamera();
      return false;
    }
  }

  async function testCamera() {
    const opened = await openCameraPreview();
    if (opened) {
      setMessage("Camera active. If scanning is unsupported, paste the QR or card link below.");
    }
  }

  async function startCamera(nextFacingMode = facingMode) {
    setMessage("");

    const opened = await openCameraPreview(nextFacingMode);
    if (!opened) {
      return;
    }

    if (!window.BarcodeDetector) {
      setScannerState("barcode-unsupported");
      setMessage("Camera scanning is not supported by this browser. You can still paste the scan token manually.");
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      setIsScanning(true);
      setScannerState("camera-active");
      scanLoop();
    } catch (error) {
      console.warn("LoyaltyBase scanner detector error", error);
      setScannerState("scan-failed");
      setMessage("Scanner could not read QR codes in this browser. Paste the scan token or customer card link below.");
    }
  }

  async function scanLoop() {
    if (!videoRef.current || !detectorRef.current) return;

    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      const qrValue = codes[0]?.rawValue;
      if (qrValue) {
        setScannerState("scan-detected");
        setMessage("Scan detected. Opening secure validation...");
        redirectFromValue(qrValue);
        return;
      }
    } catch (error) {
      console.warn("LoyaltyBase scanner detection error", error);
      setScannerState("scan-failed");
      setMessage("Invalid loyalty QR code.");
    }

    animationRef.current = requestAnimationFrame(scanLoop);
  }

  async function switchCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  }

  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#F97316]">Camera scanner</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Scan customer QR</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">Point the camera at a LoyaltyBase customer card QR code.</p>
        </div>
        <a href={backHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
          Back
        </a>
      </div>

      {message ? (
        <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-[#9A3412]">
          {message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ScannerStatus label="Camera permission pending" active={scannerState === "permission-pending"} />
        <ScannerStatus label="Camera active" active={scannerState === "camera-active"} positive />
        <ScannerStatus label="Camera blocked" active={scannerState === "camera-blocked"} danger />
        <ScannerStatus label="BarcodeDetector unsupported" active={scannerState === "barcode-unsupported"} />
        <ScannerStatus label="No camera found" active={scannerState === "no-camera"} danger />
        <ScannerStatus label="Using manual entry fallback" active={scannerState === "manual-fallback" || scannerState === "barcode-unsupported"} />
        <ScannerStatus label="Scan detected" active={scannerState === "scan-detected"} positive />
        <ScannerStatus label="Scan failed" active={scannerState === "scan-failed"} danger />
        <ScannerStatus label="HTTPS or localhost ready" active={typeof window !== "undefined" ? isLocalOrSecure() : true} positive />
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-[#111827] bg-[#111827]">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover sm:aspect-video" muted playsInline />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <button type="button" onClick={testCamera} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#FED7AA] bg-orange-50 px-4 text-sm font-semibold text-[#9A3412]">
          <Video className="h-4 w-4" aria-hidden="true" />
          Test Camera
        </button>
        <button type="button" onClick={() => startCamera()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
          <Camera className="h-4 w-4" aria-hidden="true" />
          Start Camera
        </button>
        <button type="button" onClick={stopCamera} disabled={!isCameraOpen && !isScanning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-50">
          <Square className="h-4 w-4" aria-hidden="true" />
          Stop Camera
        </button>
        <button type="button" onClick={switchCamera} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Switch Camera
        </button>
      </div>

      <div className="mt-5 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Paste QR / Card Link
          <input
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            className="min-h-12 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-normal outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            placeholder="scan_... or https://domain.com/scan/scan_..."
          />
        </label>
        <button type="button" onClick={() => redirectFromValue(manualValue)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white sm:w-auto">
          <ClipboardType className="h-4 w-4" aria-hidden="true" />
          Validate QR
        </button>
        <p className="mt-3 flex items-center gap-2 text-xs text-[#6B7280]">
          <Zap className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
          Camera scan and manual paste both use the existing secure scan validation flow.
        </p>
      </div>
    </section>
  );
}

function ScannerStatus({
  label,
  active,
  positive = false,
  danger = false,
}: {
  label: string;
  active: boolean;
  positive?: boolean;
  danger?: boolean;
}) {
  const activeClass = danger
    ? "border-red-200 bg-red-50 text-red-700"
    : positive
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-orange-200 bg-orange-50 text-[#9A3412]";

  return (
    <div className={`flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${active ? activeClass : "border-[#E5E7EB] bg-[#FAFAFA] text-[#6B7280]"}`}>
      {danger ? <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </div>
  );
}
