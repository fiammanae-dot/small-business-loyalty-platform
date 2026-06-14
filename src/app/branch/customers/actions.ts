"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveBranch, requireUsableSubscription } from "@/lib/commercial-access";
import { validateCsrfForm } from "@/lib/csrf";
import { enrollCustomerForBusiness, fail } from "@/lib/customers";
import { requireRole } from "@/lib/session";

export async function createBranchCustomerAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "branch:customers");
  } catch {
    fail("/branch/customers/new", "Security check failed. Please refresh and try again.");
  }

  const user = await requireRole("BRANCH_MANAGER");

  if (!user.businessId || !user.branchId) {
    fail("/branch/customers/new", "Branch assignment is required.");
  }
  await requireUsableSubscription(user.businessId).catch((error) => fail("/branch/customers/new", error.message));
  await requireActiveBranch(user.branchId, user.businessId).catch((error) => fail("/branch/customers/new", error.message));

  const customer = await enrollCustomerForBusiness({
    user: user as typeof user & { businessId: number },
    formData,
    path: "/branch/customers/new",
    forcedBranchId: user.branchId,
    forcedSource: "STAFF",
  });

  revalidatePath("/branch/customers");
  redirect(`/branch/customers/${customer.uuid}?success=Customer enrolled successfully.`);
}
