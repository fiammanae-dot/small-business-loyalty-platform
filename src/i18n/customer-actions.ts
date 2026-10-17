"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { syncAppleWalletAfterCashbackChange, syncAppleWalletAfterTierChange } from "@/lib/walletwallet/service";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, resolveLocale } from "./locales";

/**
 * A customer switched language on their card. Remember it on this device
 * (cookie), on their record (so messages and new passes use it), and rewrite
 * the wallet passes they already added so the phone shows the new language.
 */
export async function setCustomerLocaleAction(locale: string, cardToken?: string) {
  const chosen = resolveLocale(locale);
  const store = await cookies();
  store.set(LOCALE_COOKIE, chosen, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });

  if (!cardToken) return;
  const membership = await prisma.businessCustomerMembership.findUnique({
    where: { cardToken },
    select: { id: true, preferredLocale: true },
  });
  if (!membership || membership.preferredLocale === chosen) return;
  await prisma.businessCustomerMembership.update({ where: { id: membership.id }, data: { preferredLocale: chosen } });
  // Update-only: these never mint a pass nobody added.
  await syncAppleWalletAfterTierChange(membership.id);
  await syncAppleWalletAfterCashbackChange(membership.id);
}
