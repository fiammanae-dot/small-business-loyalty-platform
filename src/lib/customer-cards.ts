import "server-only";

import { randomBytes } from "crypto";
import type { BusinessBranding } from "@prisma/client";
import QRCode from "qrcode";
import { getRequestBaseUrl } from "@/lib/app-url";
import { formatUaePhoneDisplay } from "@/lib/phone";

export const defaultCardBranding = {
  primaryColor: "#F97316",
  secondaryColor: "#FDBA74",
  backgroundColor: "#FFFFFF",
  textColor: "#111827",
  buttonColor: "#F97316",
  logoUrl: null,
};

export function generateCardToken() {
  return `cst_${randomBytes(18).toString("base64url")}`;
}

export function maskPhoneNumber(phone: string) {
  return formatUaePhoneDisplay(phone);
}

export function getShortCardToken(token: string) {
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

export async function getBaseUrl() {
  return getRequestBaseUrl();
}

export async function getCardUrl(token: string) {
  return `${await getBaseUrl()}/card/${token}`;
}

export async function getCardQrDataUrl(token: string) {
  return QRCode.toDataURL(await getCardUrl(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
  });
}

export function resolveBranding(branding?: BusinessBranding | null) {
  return {
    primaryColor: branding?.primaryColor ?? defaultCardBranding.primaryColor,
    secondaryColor: branding?.secondaryColor ?? defaultCardBranding.secondaryColor,
    backgroundColor: branding?.backgroundColor ?? defaultCardBranding.backgroundColor,
    textColor: branding?.textColor ?? defaultCardBranding.textColor,
    buttonColor: branding?.buttonColor ?? defaultCardBranding.buttonColor,
    logoUrl: branding?.logoUrl ?? null,
  };
}



