import "server-only";

import { randomBytes } from "crypto";
import type { BusinessBranding } from "@prisma/client";
import { getRequestBaseUrl } from "@/lib/app-url";

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
  const compact = phone.replace(/[\s\-()]/g, "");
  if (compact.length <= 6) return compact;

  const prefixLength = compact.startsWith("+") ? 4 : 3;
  const prefix = compact.slice(0, prefixLength);
  const suffix = compact.slice(-3);
  return `${prefix}${"*".repeat(Math.max(4, compact.length - prefixLength - 3))}${suffix}`;
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
