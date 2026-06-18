"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { validateCsrfForm } from "@/lib/csrf";
import { requestPasswordReset } from "@/lib/password-reset";

const resetRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

function getRequestMetaFromHeaders(headersList: Headers) {
  return {
    ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip"),
    userAgent: headersList.get("user-agent"),
  };
}

export async function forgotPasswordAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  try {
    validateCsrfForm(formData, "forgot-password");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const parsed = resetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  try {
    const headersList = await headers();
    await requestPasswordReset(parsed.data.email, getRequestMetaFromHeaders(headersList));
  } catch (error) {
    console.error("Password reset request failed", error);
  }

  return {
    success: "If an active account exists for that email, a password reset link has been sent.",
  };
}
