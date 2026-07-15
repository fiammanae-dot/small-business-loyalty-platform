"use server";

import { validateCsrfForm } from "@/lib/csrf";
import { LOGO_MAX_BYTES, saveLogoFile, validateLogoBytes, validateLogoFile } from "@/lib/logo-storage";
import { requireRole } from "@/lib/session";

export type BusinessLogoUploadResult = { url: string; error?: never } | { url?: never; error: string };

export async function uploadBusinessLogoAction(formData: FormData): Promise<BusinessLogoUploadResult> {
  await requireRole("PLATFORM_OWNER");

  try {
    validateCsrfForm(formData, "platform:businesses");
  } catch {
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
