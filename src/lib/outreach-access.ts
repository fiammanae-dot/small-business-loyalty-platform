import "server-only";

import { getCurrentUser } from "@/lib/session";
import { getActiveSupportSessionForCurrentAdmin } from "@/lib/support-sessions";
import type { OutreachScope } from "@/lib/outreach";

export type OutreachActor = { userId: number; scope: OutreachScope; role: "BUSINESS_OWNER" | "BRANCH_MANAGER"; homePath: string };

/**
 * Who may send outreach: the business owner (whole business) and a branch
 * manager (their branch's customers). Returns null for anyone else.
 */
export async function getOutreachActor(): Promise<OutreachActor | null> {
  const support = await getActiveSupportSessionForCurrentAdmin();
  if (support && !support.supportSession.readOnly) {
    return { userId: support.user.id, scope: { businessId: support.user.businessId }, role: "BUSINESS_OWNER", homePath: "/dashboard/outreach" };
  }
  const user = await getCurrentUser();
  if (!user || !user.businessId) return null;
  if (user.role === "BUSINESS_OWNER") return { userId: user.id, scope: { businessId: user.businessId }, role: "BUSINESS_OWNER", homePath: "/dashboard/outreach" };
  if (user.role === "BRANCH_MANAGER" && user.branchId) {
    return { userId: user.id, scope: { businessId: user.businessId, branchId: user.branchId }, role: "BRANCH_MANAGER", homePath: "/branch/outreach" };
  }
  return null;
}
