"use server";

import { validateCsrfForm } from "@/lib/csrf";
import { LOGO_MAX_BYTES, saveLogoFile, validateLogoBytes, validateLogoFile } from "@/lib/logo-storage";
import { getCurrentUser } from "@/lib/session";

export type BusinessLogoUploadResult = { url: string; error?: never } | { url?: never; error: string };

// The two branding editors that legitimately upload logos: the platform admin
// business form and the Business Owner Brand Assets Center. The CSRF token is
// scope-bound, so we accept exactly these two scopes and nothing else.
const allowedCsrfScopes = ["platform:businesses", "dashboard:brand-assets"] as const;

function hasValidCsrf(formData: FormData) {
  return allowedCsrfScopes.some((scope) => {
    try {
      validateCsrfForm(formData, scope);
      return true;
    } catch {
      return false;
    }
  });
}

export async function uploadBusinessLogoAction(formData: FormData): Promise<BusinessLogoUploadResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "PLATFORM_OWNER" && user.role !== "BUSINESS_OWNER")) {
    return { error: "You do not have permission to upload a business logo." };
  }

  if (!hasValidCsrf(formData)) {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const file = formData.get("logoFile");
  if (!(file instanceof File)) {
    return { error: "Choose a logo image to upload." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: "Logo must be 2MB or smaller." };
  }

  const fileCheck = validateLogoFile(file);
  if (!fileCheck.ok) {
    return { error: fileCheck.error };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const bytesCheck = validateLogoBytes(buffer, fileCheck.extension);
  if (!bytesCheck.ok) {
    return { error: bytesCheck.error };
  }

  try {
    const url = await saveLogoFile(buffer, fileCheck.extension);
    return { url };
  } catch (error) {
    console.warn("[logo-upload] failed to store logo", error);
    return { error: "The logo could not be saved. Please try again." };
  }
}
