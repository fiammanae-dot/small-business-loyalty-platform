import "server-only";

import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/customer-cards";

export function generateScanToken() {
  return `scan_${randomBytes(24).toString("base64url")}`;
}

export async function getScanUrl(token: string) {
  return `${await getBaseUrl()}/scan/${token}`;
}

export async function getScanQrDataUrl(token: string) {
  const scanUrl = await getScanUrl(token);
  return QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
  });
}

export function extractScanToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const directMatch = trimmed.match(/^scan_[A-Za-z0-9_-]+$/);
  if (directMatch) return directMatch[0];

  const genericTokenMatch = trimmed.match(/^[A-Za-z0-9_-]{3,160}$/);
  if (genericTokenMatch) return genericTokenMatch[0];

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const scanIndex = parts.indexOf("scan");
    const cardIndex = parts.indexOf("card");
    const token = scanIndex >= 0 ? parts[scanIndex + 1] : cardIndex >= 0 ? parts[cardIndex + 1] : "";
    return token?.match(/^[A-Za-z0-9_-]{3,160}$/) ? token : "";
  } catch {
    const fallbackMatch = trimmed.match(/\/(?:scan|card)\/([A-Za-z0-9_-]{3,160})/);
    return fallbackMatch?.[1] ?? "";
  }
}

export function scanStatusLabel(status: string) {
  return status.toLowerCase();
}
