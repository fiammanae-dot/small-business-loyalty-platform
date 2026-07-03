import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RecordStatus, UserRole } from "@prisma/client";
import { devFallbackUser, isDevAuthFallbackEnabled } from "@/lib/dev-auth";
import { prisma } from "@/lib/prisma";
import { roleHomePath } from "@/lib/roles";
import { getSessionSecret } from "@/lib/secrets";

const SESSION_COOKIE = "loyalty_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const INACTIVE_BUSINESS_ACCESS_MESSAGE =
  "Your business account is currently inactive. Please contact Loyalty Card UAE support.";

type SessionPayload = {
  userId: number;
  role: UserRole;
  sessionVersion: number;
  exp: number;
};

export type AuthUser = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: UserRole;
  businessId: number | null;
  businessStatus: RecordStatus | null;
  branchId: number | null;
  forcePasswordChange: boolean;
};

export function isBusinessScopedRole(role: UserRole) {
  return role === "BUSINESS_OWNER" || role === "BRANCH_MANAGER" || role === "STAFF";
}

export function hasActiveBusinessAccess(user: Pick<AuthUser, "role" | "businessId" | "businessStatus">) {
  if (!isBusinessScopedRole(user.role)) return true;
  return Boolean(user.businessId && user.businessStatus === "ACTIVE");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function createSessionValue(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifySessionValue(value?: string): SessionPayload | null {
  if (!value) return null;

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (
      payload.userId === undefined ||
      !payload.role ||
      payload.sessionVersion === undefined ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: { id: number; role: UserRole }) {
  const cookieStore = await cookies();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sessionUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { sessionVersion: true },
  });
  const sessionVersion = sessionUser?.sessionVersion ?? 1;

  cookieStore.set(SESSION_COOKIE, createSessionValue({ userId: user.id, role: user.role, sessionVersion, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const session = verifySessionValue(cookieStore.get(SESSION_COOKIE)?.value);

  if (session && session.userId !== devFallbackUser.id) {
    try {
      await prisma.user.updateMany({
        where: {
          id: session.userId,
          role: session.role,
          sessionVersion: session.sessionVersion,
        },
        data: {
          sessionVersion: { increment: 1 },
        },
      });
    } catch (error) {
      console.error("Session invalidation failed", error);
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const session = verifySessionValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  if (
    isDevAuthFallbackEnabled() &&
    session.userId === devFallbackUser.id &&
    session.role === devFallbackUser.role
  ) {
    return devFallbackUser;
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: session.userId,
        role: session.role,
        status: "ACTIVE",
      },
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        role: true,
        sessionVersion: true,
        forcePasswordChange: true,
        businessId: true,
        business: {
          select: {
            status: true,
          },
        },
        branchId: true,
      },
    });

    if (!user || user.sessionVersion !== session.sessionVersion) {
      return null;
    }

    return {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      businessStatus: user.business?.status ?? null,
      branchId: user.branchId,
      forcePasswordChange: user.forcePasswordChange,
    };
  } catch (error) {
    console.error("Session database lookup failed", error);
    return null;
  }
}

export async function requireRole(role: UserRole) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== role) {
    redirect(roleHomePath[user.role]);
  }

  if (!hasActiveBusinessAccess(user)) {
    redirect("/business-inactive");
  }

  if (user.forcePasswordChange) {
    redirect("/change-password");
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHomePath[user.role]);
  }
}
