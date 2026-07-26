import type { RecordStatus, UserRole } from "@prisma/client";

/**
 * Pure authorization policy: no server imports, no Prisma client, no Next.js.
 * This module is the single place that decides WHO may act on business-scoped
 * data. src/lib/authz.ts wraps these decisions with the redirect/fail side
 * effects; keeping the decisions pure lets tests exercise every allowed/denied
 * combination directly under node --test.
 */

export const BUSINESS_SCOPED_ROLES = ["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"] as const;
export type BusinessScopedRole = (typeof BUSINESS_SCOPED_ROLES)[number];

export type PolicyUser = {
  role: UserRole;
  businessId: number | null;
  businessStatus: RecordStatus | null;
  branchId: number | null;
};

export type BusinessAccessDenialReason =
  | "UNAUTHENTICATED"
  | "ROLE_NOT_ALLOWED"
  | "MISSING_BUSINESS"
  | "INACTIVE_BUSINESS";

export type BusinessAccessResult =
  | { ok: true; businessId: number }
  | { ok: false; reason: BusinessAccessDenialReason };

/**
 * Gold-standard check order from the scanner actions: authenticated → role
 * allowed → business assigned → business ACTIVE. Callers map each denial
 * reason to their own failure style (redirect vs. error message).
 */
export function evaluateBusinessScopedAccess(
  user: PolicyUser | null,
  options: { roles?: readonly BusinessScopedRole[] } = {},
): BusinessAccessResult {
  const roles = options.roles ?? BUSINESS_SCOPED_ROLES;

  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };
  if (!(roles as readonly string[]).includes(user.role)) return { ok: false, reason: "ROLE_NOT_ALLOWED" };
  if (!user.businessId) return { ok: false, reason: "MISSING_BUSINESS" };
  if (user.businessStatus !== "ACTIVE") return { ok: false, reason: "INACTIVE_BUSINESS" };

  return { ok: true, businessId: user.businessId };
}

export function isSameBusiness(resourceBusinessId: number, businessId: number): boolean {
  return resourceBusinessId === businessId;
}

/**
 * Branch scoping rule for STAFF and BRANCH_MANAGER: they may only act on
 * customers created in their own assigned branch, and a missing branch
 * assignment blocks them entirely. BUSINESS_OWNER and PLATFORM_OWNER are
 * business-wide, so this never restricts them. Same semantics as the helper
 * previously duplicated inside the scanner actions and scan result page.
 */
export function isOutOfAssignedBranch(
  user: { role: string; branchId?: number | null },
  membership: { createdBranchId?: number | null },
): boolean {
  return (user.role === "STAFF" || user.role === "BRANCH_MANAGER") && (!user.branchId || membership.createdBranchId !== user.branchId);
}
