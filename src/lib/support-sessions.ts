import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { businessOwnerInclude } from "@/lib/business-context";
import { getCurrentUser, type AuthUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";

export const SUPPORT_SESSION_DURATIONS = [15, 30, 60] as const;
export const SUPPORT_REQUEST_EXPIRY_MINUTES = 30;
export const SUPPORT_SESSION_COOKIE = "loyalty_support_session";

type LoadedSupportSession = Awaited<ReturnType<typeof loadSupportSessionForAdmin>>;

export async function expireStaleSupportSessions(now = new Date()) {
  await prisma.supportSession.updateMany({
    where: { status: "ACTIVE", endedAt: null, expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
}

export async function expireStaleSupportRequests(now = new Date()) {
  await prisma.supportRequest.updateMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
}

export function isSupportSessionActive(
  session: { status: string; endedAt: Date | null; expiresAt: Date },
  now = new Date(),
) {
  return session.status === "ACTIVE" && !session.endedAt && session.expiresAt > now;
}

export async function setSupportSessionCookie(supportSessionId: number) {
  const cookieStore = await cookies();
  cookieStore.set(SUPPORT_SESSION_COOKIE, String(supportSessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSupportSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPPORT_SESSION_COOKIE);
}

export async function getSupportSessionCookieId() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SUPPORT_SESSION_COOKIE)?.value;
  const parsedId = rawValue ? Number(rawValue) : NaN;

  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

async function loadSupportSessionForAdmin(supportSessionId: number, adminUser: AuthUser) {
  const session = await prisma.supportSession.findUnique({
    where: { id: supportSessionId },
    include: {
      business: { include: businessOwnerInclude },
      adminUser: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!session || session.adminUserId !== adminUser.id) {
    return null;
  }

  if (!isSupportSessionActive(session)) {
    if (session.status === "ACTIVE" && !session.endedAt && session.expiresAt <= new Date()) {
      await prisma.supportSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }

    return null;
  }

  return {
    user: {
      ...adminUser,
      role: "BUSINESS_OWNER" as const,
      businessId: session.businessId,
      businessStatus: session.business.status,
    },
    business: session.business,
    supportSession: session,
  };
}

export async function getActiveSupportSessionForCurrentAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "PLATFORM_OWNER") {
    return null;
  }

  const supportSessionId = await getSupportSessionCookieId();
  if (!supportSessionId) {
    return null;
  }

  const supportContext = await loadSupportSessionForAdmin(supportSessionId, currentUser);

  return supportContext;
}

export async function requireSupportBusinessContext(supportSessionId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "PLATFORM_OWNER") {
    redirect(roleHomePath[currentUser.role]);
  }

  const parsedId = Number(supportSessionId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    redirect("/platform/businesses?error=Support%20session%20is%20not%20available.");
  }

  const supportContext = await loadSupportSessionForAdmin(parsedId, currentUser);
  if (!supportContext) {
    redirect("/platform/businesses?error=Support%20session%20has%20ended%20or%20expired.");
  }

  return supportContext;
}

export type SupportBusinessContext = NonNullable<LoadedSupportSession>;
