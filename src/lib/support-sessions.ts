import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { businessOwnerInclude } from "@/lib/business-owner";
import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";

export const SUPPORT_SESSION_DURATIONS = [15, 30, 60] as const;

export async function expireStaleSupportSessions(now = new Date()) {
  await prisma.supportSession.updateMany({
    where: {
      status: "ACTIVE",
      endedAt: null,
      expiresAt: { lte: now },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

export function isSupportSessionActive(session: { status: string; endedAt: Date | null; expiresAt: Date }, now = new Date()) {
  return session.status === "ACTIVE" && !session.endedAt && session.expiresAt > now;
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

  const session = await prisma.supportSession.findUnique({
    where: { id: parsedId },
    include: {
      business: { include: businessOwnerInclude },
      adminUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!session || session.adminUserId !== currentUser.id) {
    redirect("/platform/businesses?error=Support%20session%20is%20not%20available.");
  }

  if (!isSupportSessionActive(session)) {
    if (session.status === "ACTIVE" && !session.endedAt && session.expiresAt <= new Date()) {
      await prisma.supportSession.update({ where: { id: session.id }, data: { status: "EXPIRED" } });
    }
    redirect(`/platform/businesses/${session.business.uuid}?error=Support%20session%20has%20ended%20or%20expired.`);
  }


  return {
    user: {
      ...currentUser,
      businessId: session.businessId,
      businessStatus: session.business.status,
    },
    business: session.business,
    supportSession: session,
  };
}