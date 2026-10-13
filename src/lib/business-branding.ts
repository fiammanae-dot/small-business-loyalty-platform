import "server-only";

import type { BusinessBranding } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/session";

export const defaultBusinessBranding = {
  primaryColor: "#F26A21",
  secondaryColor: "#FDBA74",
  backgroundColor: "#FFFFFF",
  textColor: "#111827",
  buttonColor: "#F26A21",
  logoUrl: null as string | null,
};

export type ResolvedBusinessBranding = typeof defaultBusinessBranding;

// Role-identity fallback for the logged-in Business Owner workspace only.
// Customer-facing surfaces (join pages, posters, referrals) keep defaultBusinessBranding.
// Businesses with custom branding are unaffected everywhere.
export const businessOwnerOperationalDefaults: ResolvedBusinessBranding = {
  primaryColor: "#16A34A",
  secondaryColor: "#86EFAC",
  backgroundColor: "#FFFFFF",
  textColor: "#111827",
  buttonColor: "#16A34A",
  logoUrl: null,
};

export function resolveBusinessBranding(
  branding?: BusinessBranding | null,
  defaults: ResolvedBusinessBranding = defaultBusinessBranding,
): ResolvedBusinessBranding {
  return {
    primaryColor: sanitizeHexColor(branding?.primaryColor) ?? defaults.primaryColor,
    secondaryColor: sanitizeHexColor(branding?.secondaryColor) ?? defaults.secondaryColor,
    backgroundColor: sanitizeHexColor(branding?.backgroundColor) ?? defaults.backgroundColor,
    textColor: sanitizeHexColor(branding?.textColor) ?? defaults.textColor,
    buttonColor: sanitizeHexColor(branding?.buttonColor) ?? defaults.buttonColor,
    logoUrl: branding?.logoUrl ?? null,
  };
}

// The page frame and the scanner both read the branding; once per request is enough.
const loadBusinessBranding = cache((businessId: number) =>
  prisma.business.findFirst({ where: { id: businessId }, select: { branding: true } }),
);

export async function getOperationalBusinessBranding(user: AuthUser) {
  if (user.role === "PLATFORM_OWNER" || !user.businessId) {
    return null;
  }

  const business = await loadBusinessBranding(user.businessId);

  return resolveBusinessBranding(business?.branding, user.role === "BUSINESS_OWNER" ? businessOwnerOperationalDefaults : undefined);
}

function sanitizeHexColor(value?: string | null) {
  if (!value) return null;
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : null;
}
