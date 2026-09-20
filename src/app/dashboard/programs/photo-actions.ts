"use server";

import { validateCsrfForm } from "@/lib/csrf";
import {
  WALLET_PHOTO_MAX_BYTES,
  saveWalletPhotoFile,
  validateLogoBytes,
  validateWalletPhotoFile,
} from "@/lib/logo-storage";
import { getCurrentUser } from "@/lib/session";

export type WalletPhotoUploadResult = { url: string; error?: never } | { url?: never; error: string };

/**
 * Stores the picture a business wants on its wallet card in place of the
 * stamps. Kept apart from the logo upload because the two have different size
 * limits and different accepted formats, and because this one is bound to the
 * program form's CSRF scope rather than the branding editors'.
 */
export async function uploadWalletPhotoAction(formData: FormData): Promise<WalletPhotoUploadResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "BUSINESS_OWNER" && user.role !== "PLATFORM_OWNER")) {
    return { error: "You do not have permission to upload a card picture." };
  }

  try {
    validateCsrfForm(formData, "dashboard:programs");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const file = formData.get("walletPhotoFile");
  if (!(file instanceof File)) {
    return { error: "Choose a picture to upload." };
  }
  if (file.size > WALLET_PHOTO_MAX_BYTES) {
    return { error: "The picture must be 4MB or smaller." };
  }

  const fileCheck = validateWalletPhotoFile(file);
  if (!fileCheck.ok) {
    return { error: fileCheck.error };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const bytesCheck = validateLogoBytes(buffer, fileCheck.extension);
  if (!bytesCheck.ok) {
    return { error: bytesCheck.error };
  }

  try {
    const url = await saveWalletPhotoFile(buffer, fileCheck.extension);
    return { url };
  } catch (error) {
    console.warn("[wallet-photo-upload] failed to store picture", error);
    return { error: "The picture could not be saved. Please try again." };
  }
}
