"use server";

import { headers } from "next/headers";
import { validateCsrfForm } from "@/lib/csrf";
import { resetPasswordWithToken } from "@/lib/password-reset";

export type ResetPasswordState = {
  error?: string;
  success?: string;
};

function getRequestMetaFromHeaders(headersList: Headers) {
  return {
    ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip"),
    userAgent: headersList.get("user-agent"),
  };
}

export async function resetPasswordAction(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  try {
    validateCsrfForm(formData, "reset-password");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const headersList = await headers();
  const result = await resetPasswordWithToken({
    token,
    newPassword,
    confirmPassword,
    meta: getRequestMetaFromHeaders(headersList),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success: "Your password has been reset. You can now sign in with your new password.",
  };
}
