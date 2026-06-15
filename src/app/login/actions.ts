"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { RecordStatus, UserRole } from "@prisma/client";
import { devFallbackUser, verifyDevFallbackCredentials } from "@/lib/dev-auth";
import { validateCsrfForm } from "@/lib/csrf";
import { isLoginTemporarilyLocked, LOGIN_LOCKOUT_MESSAGE, recordFailedLogin } from "@/lib/login-protection";
import { prisma } from "@/lib/prisma";
import { roleHomePath } from "@/lib/roles";
import { createSession } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const INVALID_LOGIN_MESSAGE = "Invalid email or password.";

export type LoginState = {
  error?: string;
};

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  try {
    validateCsrfForm(formData, "login");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: INVALID_LOGIN_MESSAGE };
  }
  const email = parsed.data.email.toLowerCase();

  let user: {
    id: number;
    email: string;
    passwordHash: string;
    role: UserRole;
    status: RecordStatus;
    forcePasswordChange: boolean;
  } | null;

  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        forcePasswordChange: true,
      },
    });
  } catch (error) {
    console.error("Login database lookup failed", error);
    if (
      await verifyDevFallbackCredentials(email, parsed.data.password)
    ) {
      await createSession({ id: devFallbackUser.id, role: devFallbackUser.role });
      redirect(roleHomePath[devFallbackUser.role]);
    }

    return {
      error: INVALID_LOGIN_MESSAGE,
    };
  }

  const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || user.status !== "ACTIVE" || !passwordMatches) {
    const locked = await isLoginTemporarilyLocked(email);
    await recordFailedLogin(email, locked ? "LOCKED" : "FAILED");
    if (locked) {
      return { error: LOGIN_LOCKOUT_MESSAGE };
    }
    return { error: INVALID_LOGIN_MESSAGE };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession({ id: user.id, role: user.role });
  redirect(user.forcePasswordChange ? "/change-password" : roleHomePath[user.role]);
}
