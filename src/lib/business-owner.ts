import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBusinessScopedUserOrRedirect } from "@/lib/authz";
import { businessOwnerInclude } from "@/lib/business-context";
import { getActiveSupportSessionForCurrentAdmin } from "@/lib/support-sessions";

export { businessOwnerInclude } from "@/lib/business-context";

export async function requireBusinessOwner() {
  // Same behavior as before: requireRole("BUSINESS_OWNER") semantics, then a
  // missing businessId redirects to /login (the guard's default).
  return requireBusinessScopedUserOrRedirect({ roles: ["BUSINESS_OWNER"] });
}

/**
 * Resolve the acting business owner for a WRITE action.
 *
 * A platform admin running an edit-mode support session (readOnly = false)
 * acts as the owner of the session's business, so the settings/program writes
 * they perform target that business while the audit trail still records the
 * admin as the actor. Reads already resolve this way via getBusinessOwnerContext.
 *
 * Everyone else is unchanged: a real BUSINESS_OWNER goes through
 * requireBusinessOwner() as before, and a platform admin with no session (or a
 * read-only one) falls through to requireBusinessOwner(), which redirects them
 * to /platform. The write is never silently dropped.
 */
export async function requireBusinessOwnerForWrite(): Promise<{ id: number; businessId: number }> {
  const supportContext = await getActiveSupportSessionForCurrentAdmin();
  if (supportContext && !supportContext.supportSession.readOnly) {
    return { id: supportContext.user.id, businessId: supportContext.user.businessId };
  }

  const user = await requireBusinessOwner();
  return { id: user.id, businessId: user.businessId };
}

export async function getBusinessOwnerContext() {
  const supportContext = await getActiveSupportSessionForCurrentAdmin();
  if (supportContext) {
    return supportContext;
  }

  const user = await requireBusinessOwner();
  const business = await prisma.business.findFirst({
    where: { id: user.businessId },
    include: businessOwnerInclude,
  });

  if (!business) {
    redirect("/login");
  }

  return { user, business, supportSession: null };
}

export function getCurrentPlan(
  business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"],
) {
  return business.subscriptions[0]?.subscriptionPlan ?? null;
}

export function getCurrentSubscription(
  business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"],
) {
  return business.subscriptions[0] ?? null;
}
