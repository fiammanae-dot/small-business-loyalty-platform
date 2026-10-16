"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusinessOwnerForWrite } from "@/lib/business-owner";
import { validateCsrfForm } from "@/lib/csrf";
import { saveReferralSettings } from "@/lib/referral-settings";

const PAGE = "/dashboard/referrals";

/** Saves the business's one referral reward (Referral Center > Referral reward). */
export async function saveReferralSettingsAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "dashboard:referral-settings");
  } catch {
    redirect(`${PAGE}?error=${encodeURIComponent("Security check failed. Please refresh and try again.")}`);
  }
  const user = await requireBusinessOwnerForWrite();
  const input: Record<string, string> = {};
  for (const key of ["rewardType", "stampProgramId", "referrerStamps", "friendStamps", "referrerCashback", "friendCashback"]) {
    const value = formData.get(key);
    input[key] = typeof value === "string" ? value : "";
  }
  const result = await saveReferralSettings(user.businessId, input);
  if (!result.ok) redirect(`${PAGE}?error=${encodeURIComponent(result.error)}`);
  revalidatePath(PAGE);
  redirect(`${PAGE}?success=${encodeURIComponent("Referral reward saved.")}`);
}
