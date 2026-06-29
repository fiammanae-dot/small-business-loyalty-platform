"use server";

import { redirect } from "next/navigation";
import { requireActiveBranch, requireUsableSubscription } from "@/lib/commercial-access";
import { validateCsrfForm } from "@/lib/csrf";
import { enrollCustomerForBusiness, getString } from "@/lib/customers";
import { createFormFailure, isFormActionError, type PreservedFormState } from "@/lib/form-state";
import { requireRole } from "@/lib/session";

const customerCreateFormFields = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "birthday",
  "marketingConsent",
  "selectedProgramUuid",
  "referredByPhoneNumber",
  "referralCode",
  "notes",
];

function customerCreateFailure(formData: FormData, message: string, fieldErrors?: Record<string, string>): PreservedFormState {
  return createFormFailure({
    formData,
    fields: customerCreateFormFields,
    checkboxFields: ["marketingConsent"],
    message,
    fieldErrors,
  });
}

export async function createStaffCustomerAction(_prevState: PreservedFormState, formData: FormData): Promise<PreservedFormState> {
  try {
    validateCsrfForm(formData, "staff:customers");
  } catch {
    return customerCreateFailure(formData, "Security check failed. Please refresh and try again.");
  }

  const user = await requireRole("STAFF");

  if (!user.businessId || !user.branchId) {
    return customerCreateFailure(formData, "Branch assignment is required.");
  }
  let customer: Awaited<ReturnType<typeof enrollCustomerForBusiness>>;
  try {
    await requireUsableSubscription(user.businessId);
    await requireActiveBranch(user.branchId, user.businessId);

    customer = await enrollCustomerForBusiness({
      user: user as typeof user & { businessId: number },
      formData,
      path: "/staff/customers/new",
      forcedBranchId: user.branchId,
      forcedSource: "STAFF",
      selectedProgramUuid: getString(formData, "selectedProgramUuid") || undefined,
      programEnrollmentSource: "BRANCH_MANAGER",
      preserveFormState: true,
    });
  } catch (error) {
    if (isFormActionError(error)) {
      return customerCreateFailure(formData, error.message, error.fieldErrors);
    }
    if (error instanceof Error) {
      return customerCreateFailure(formData, error.message);
    }
    return customerCreateFailure(formData, "Customer enrollment failed. Please try again.");
  }

  const params = new URLSearchParams({
    card: customer.cardToken,
    success:
      customer.programEnrollmentStatus === "ENROLLED"
        ? "Customer created and enrolled successfully."
        : "Customer created successfully. No active loyalty program is available for enrollment.",
  });
  redirect(`/staff/customers/success?${params.toString()}`);
}
