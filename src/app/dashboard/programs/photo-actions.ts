"use server";

import { validateCsrfForm } from "@/lib/csrf";
import {
  WALLET_PHOTO_MAX_BYTES,
  saveStampIconFile,
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

/**
 * Same as uploadWalletPhotoAction, but bound to the cashback setup form's CSRF
 * scope. Cashback is its own program with its own card picture, saved through
 * saveCashbackSettingsAction ("dashboard:cashback-settings"), so its upload
 * must carry that scope's token rather than the program form's.
 */
export async function uploadCashbackPhotoAction(formData: FormData): Promise<WalletPhotoUploadResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "BUSINESS_OWNER" && user.role !== "PLATFORM_OWNER")) {
    return { error: "You do not have permission to upload a card picture." };
  }

  try {
    validateCsrfForm(formData, "dashboard:cashback-settings");
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
    console.warn("[cashback-photo-upload] failed to store picture", error);
    return { error: "The picture could not be saved. Please try again." };
  }
}

const STAMP_ICON_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const STAMP_ICON_SIZE = 256;

/**
 * Stores a stamp icon the business bought or drew, to use on its cards instead
 * of the built-in icons. PNG or WEBP with a transparent background; it is
 * normalised here to a 256 x 256 PNG (fitted, never cropped) so it draws the
 * same in every stamp slot, on the web card and in both wallets. SVG is refused:
 * the wallets render pictures as bitmaps, and a stored SVG can carry script.
 */
export async function uploadStampIconAction(formData: FormData): Promise<WalletPhotoUploadResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "BUSINESS_OWNER" && user.role !== "PLATFORM_OWNER")) {
    return { error: "You do not have permission to upload a stamp icon." };
  }

  try {
    validateCsrfForm(formData, "dashboard:program-design-studio");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const file = formData.get("stampIconFile");
  if (!(file instanceof File)) return { error: "Choose an icon to upload." };
  if (file.size === 0) return { error: "The selected file is empty." };
  if (file.size > STAMP_ICON_UPLOAD_MAX_BYTES) return { error: "The icon must be 2MB or smaller." };

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension !== "png" && extension !== "webp") {
    return { error: "Use a PNG or WEBP icon with a transparent background." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const bytesCheck = validateLogoBytes(buffer, extension);
  if (!bytesCheck.ok) return { error: bytesCheck.error };

  let normalised: Buffer;
  try {
    const { default: sharp } = await import("sharp");
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 64 || metadata.height < 64) {
      return { error: "The icon must be at least 64 x 64 pixels (256 x 256 or larger is best)." };
    }
    normalised = await sharp(buffer)
      .resize(STAMP_ICON_SIZE, STAMP_ICON_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return { error: "This image could not be read. Try saving it again as PNG." };
  }

  try {
    const url = await saveStampIconFile(normalised);
    return { url };
  } catch (error) {
    console.warn("[stamp-icon-upload] failed to store icon", error);
    return { error: "The icon could not be saved. Please try again." };
  }
}
