import "server-only";

import type { BusinessBranding } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/session";

export const defaultBusinessBranding = {
  primaryColor: "#F97316",
  secondaryColor: "#FDBA74",
  backgroundColor: "#FFFFFF",
  textColor: "#111827",
  buttonColor: "#F97316",
  logoUrl: null as string | null,
};

export type ResolvedBusinessBranding = typeof defaultBusinessBranding;

export function resolveBusinessBranding(branding?: BusinessBranding | null): ResolvedBusinessBranding {
  return {
    primaryColor: sanitizeHexColor(branding?.primaryColor) ?? defaultBusinessBranding.primaryColor,
    secondaryColor: sanitizeHexColor(branding?.secondaryColor) ?? defaultBusinessBranding.secondaryColor,
    backgroundColor: sanitizeHexColor(branding?.backgroundColor) ?? defaultBusinessBranding.backgroundColor,
    textColor: sanitizeHexColor(branding?.textColor) ?? defaultBusinessBranding.textColor,
    buttonColor: sanitizeHexColor(branding?.buttonColor) ?? defaultBusinessBranding.buttonColor,
    logoUrl: branding?.logoUrl ?? null,
  };
}

export async function getOperationalBusinessBranding(user: AuthUser) {
  if (user.role === "PLATFORM_OWNER" || !user.businessId) {
    return null;
  }

  const business = await prisma.business.findFirst({
    where: { id: user.businessId },
    select: { branding: true },
  });

  return resolveBusinessBranding(business?.branding);
}

function sanitizeHexColor(value?: string | null) {
  if (!value) return null;
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : null;
}
