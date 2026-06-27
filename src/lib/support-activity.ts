import "server-only";

import { prisma } from "@/lib/prisma";

export type SupportActivityType =
  | "SESSION_STARTED"
  | "SESSION_JOINED"
  | "PAGE_VIEWED"
  | "CUSTOMER_VIEWED"
  | "PROGRAM_VIEWED"
  | "STAFF_VIEWED"
  | "BRANCH_VIEWED"
  | "SETTINGS_VIEWED"
  | "RECORD_CHANGED"
  | "SESSION_ENDED"
  | "SESSION_EXPIRED";

type SupportActivityInput = {
  supportSessionId: number;
  adminUserId: number;
  businessId: number;
  activityType: SupportActivityType;
  path?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  throttleMinutes?: number;
};

export async function recordSupportActivity({
  supportSessionId,
  adminUserId,
  businessId,
  activityType,
  path,
  entityType,
  entityId,
  description,
  throttleMinutes = 0,
}: SupportActivityInput) {
  if (throttleMinutes > 0) {
    const throttleSince = new Date(Date.now() - throttleMinutes * 60 * 1000);
    const duplicate = await prisma.supportSessionActivity.findFirst({
      where: {
        supportSessionId,
        adminUserId,
        activityType,
        path: path ?? null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        createdAt: { gte: throttleSince },
      },
      select: { id: true },
    });

    if (duplicate) {
      return duplicate;
    }
  }

  return prisma.supportSessionActivity.create({
    data: {
      supportSessionId,
      adminUserId,
      businessId,
      activityType,
      path: path ?? null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      description,
    },
  });
}

export function classifySupportPath(path: string): {
  activityType: SupportActivityType;
  entityType: string | null;
  entityId: string | null;
  description: string;
} {
  const normalizedPath = path.split("?")[0] || "/";
  const segments = normalizedPath.split("/").filter(Boolean);
  const section = segments[1] ?? "";
  const entityId = segments[2] ?? null;

  if (section === "customers" && entityId && entityId !== "new") {
    return {
      activityType: "CUSTOMER_VIEWED",
      entityType: "customer",
      entityId,
      description: "Viewed customer profile",
    };
  }

  if (section === "programs" && entityId && entityId !== "new") {
    return {
      activityType: "PROGRAM_VIEWED",
      entityType: "program",
      entityId,
      description: "Viewed loyalty program",
    };
  }

  if (section === "staff" && entityId && entityId !== "new") {
    return {
      activityType: "STAFF_VIEWED",
      entityType: "staff",
      entityId,
      description: "Viewed staff profile",
    };
  }

  if (section === "branches") {
    return {
      activityType: "BRANCH_VIEWED",
      entityType: entityId ? "branch" : null,
      entityId,
      description: entityId ? "Viewed branch details" : "Viewed branches page",
    };
  }

  if (section === "settings") {
    return {
      activityType: "SETTINGS_VIEWED",
      entityType: "settings",
      entityId: null,
      description: "Viewed business settings",
    };
  }

  return {
    activityType: "PAGE_VIEWED",
    entityType: section || null,
    entityId: null,
    description: `Viewed ${getReadablePageName(section)} page`,
  };
}

function getReadablePageName(section: string) {
  if (!section) return "dashboard";
  return section.replaceAll("-", " ");
}
