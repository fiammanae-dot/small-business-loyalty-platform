"use server";

import { redirect } from "next/navigation";
import { requireActiveBranch, requireUsableSubscription } from "@/lib/commercial-access";
import { validateCsrfForm } from "@/lib/csrf";
import { enrollCustomerForBusiness, fail } from "@/lib/customers";
import { requireRole } from "@/lib/session";

export async function createStaffCustomerAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "staff:customers");
  } catch {
    fail("/staff/customers/new", "Security check failed. Please refresh and try again.");
  }

  const user = await requireRole("STAFF");

  if (!user.businessId || !user.branchId) {
    fail("/staff/customers/new", "Branch assignment is required.");
  }
  await requireUsableSubscription(user.businessId).catch((error) => fail("/staff/customers/new", error.message));
  await requireActiveBranch(user.branchId, user.businessId).catch((error) => fail("/staff/customers/new", error.message));

  const customer = await enrollCustomerForBusiness({
    user: user as typeof user & { businessId: number },
    formData,
    path: "/staff/customers/new",
    forcedBranchId: user.branchId,
    forcedSource: "STAFF",
  });

  redirect(`/staff/customers/success?card=${encodeURIComponent(customer.cardToken)}`);
}
