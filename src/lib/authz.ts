import "server-only";

import { redirect } from "next/navigation";
import {
  BUSINESS_SCOPED_ROLES,
  evaluateBusinessScopedAccess,
  isOutOfAssignedBranch,
  isSameBusiness,
  type BusinessScopedRole,
} from "@/lib/authz-policy";
import { requireActiveBranch, requireUsableSubscription } from "@/lib/commercial-access";
import { roleHomePath } from "@/lib/roles";
import {
  getCurrentUser,
  hasActiveBusinessAccess,
  INACTIVE_BUSINESS_ACCESS_MESSAGE,
  requireRole,
  type AuthUser,
} from "@/lib/session";

/**
 * Centralized authorization guards. Every server action authorizes through one
 * of these entry points (or through requireBusinessOwner/requireRole, which
 * build on the same primitives) so no action can forget a role, tenant, or
 * commercial-access check. Decisions live in src/lib/authz-policy.ts; this
 * module only adds the redirect/fail side effects.
 */

export type BusinessScopedUser = AuthUser & { businessId: number };
export type { BusinessScopedRole };
export { BUSINESS_SCOPED_ROLES, isOutOfAssignedBranch, isSameBusiness };

export const TENANT_MISMATCH_MESSAGE = "This record does not belong to your business.";
export const BRANCH_SCOPE_MESSAGE = "This customer is outside your assigned branch scope.";

type RequireBusinessScopedUserOptions = {
  /** Allowed roles; defaults to all business-scoped roles. */
  roles?: readonly BusinessScopedRole[];
  /** Also require a commercially usable subscription (fail() receives SUBSCRIPTION_REQUIRED_MESSAGE). */
  requireSubscription?: boolean;
  /** If the user has an assigned branch, that branch must be ACTIVE (fail() receives BRANCH_INACTIVE_MESSAGE). */
  requireActiveBranch?: boolean;
  /** Failure sink for message-based denials (inactive business, subscription, branch), mirroring each action's fail(path, message). */
  fail: (message: string) => never;
  /** Override for the missing-businessId denial; defaults to redirect(roleHomePath[user.role]). */
  onMissingBusiness?: () => never;
};

/**
 * Action-style guard (mirrors the scanner actions' gold-standard preamble):
 * unauthenticated → redirect("/login"); disallowed role or missing businessId
 * → redirect(roleHomePath[user.role]); inactive business / unusable
 * subscription / inactive assigned branch → fail(message) with the exact
 * existing message strings. Returns the user with businessId guaranteed.
 */
export async function requireBusinessScopedUser(
  options: RequireBusinessScopedUserOptions,
): Promise<{ user: BusinessScopedUser; businessId: number }> {
  const user = await getCurrentUser();
  const access = evaluateBusinessScopedAccess(user, { roles: options.roles });

  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED" || !user) redirect("/login");
    if (access.reason === "ROLE_NOT_ALLOWED") redirect(roleHomePath[user.role]);
    if (access.reason === "MISSING_BUSINESS") {
      if (options.onMissingBusiness) options.onMissingBusiness();
      redirect(roleHomePath[user.role]);
    }
    options.fail(INACTIVE_BUSINESS_ACCESS_MESSAGE);
  }

  const scopedUser = user as BusinessScopedUser;

  if (options.requireSubscription) {
    await requireUsableSubscription(access.businessId).catch((error: Error) => options.fail(error.message));
  }
  if (options.requireActiveBranch && scopedUser.branchId) {
    await requireActiveBranch(scopedUser.branchId, access.businessId).catch((error: Error) => options.fail(error.message));
  }

  return { user: scopedUser, businessId: access.businessId };
}

type RequireBusinessScopedUserOrRedirectOptions = {
  /** Allowed roles; defaults to all business-scoped roles. */
  roles?: readonly BusinessScopedRole[];
  /** Override for the missing-businessId denial; defaults to redirect("/login") (requireBusinessOwner behavior). */
  onMissingBusiness?: () => never;
};

/**
 * Page-style guard that mirrors requireRole() exactly — including the
 * inactive-business redirect to /business-inactive and the forced
 * password-change redirect — then additionally guarantees businessId.
 */
export async function requireBusinessScopedUserOrRedirect(
  options: RequireBusinessScopedUserOrRedirectOptions = {},
): Promise<BusinessScopedUser> {
  const roles = options.roles ?? BUSINESS_SCOPED_ROLES;
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!(roles as readonly string[]).includes(user.role)) redirect(roleHomePath[user.role]);
  if (!hasActiveBusinessAccess(user)) redirect("/business-inactive");
  if (user.forcePasswordChange) redirect("/change-password");
  if (!user.businessId) {
    if (options.onMissingBusiness) options.onMissingBusiness();
    redirect("/login");
  }

  return user as BusinessScopedUser;
}

/** Platform administration guard: PLATFORM_OWNER only, requireRole semantics. */
export async function requirePlatformAdmin(): Promise<AuthUser> {
  return requireRole("PLATFORM_OWNER");
}

/**
 * Tenant-ownership assertion for rows fetched by a unique key (token, uuid,
 * idempotency key) rather than a businessId-scoped query. Throws by default;
 * pass onMismatch to preserve an action's exact failure message and target.
 */
export function assertSameBusiness(resourceBusinessId: number, businessId: number, onMismatch?: () => never): void {
  if (!isSameBusiness(resourceBusinessId, businessId)) {
    if (onMismatch) onMismatch();
    throw new Error(TENANT_MISMATCH_MESSAGE);
  }
}

/**
 * Branch-scope assertion for STAFF/BRANCH_MANAGER acting on a customer row.
 * Throws by default; pass onMismatch to preserve an action's exact failure
 * message and target.
 */
export function assertSameBranch(
  resourceBranchId: number | null | undefined,
  user: Pick<AuthUser, "role" | "branchId">,
  onMismatch?: () => never,
): void {
  if (isOutOfAssignedBranch(user, { createdBranchId: resourceBranchId ?? null })) {
    if (onMismatch) onMismatch();
    throw new Error(BRANCH_SCOPE_MESSAGE);
  }
}
