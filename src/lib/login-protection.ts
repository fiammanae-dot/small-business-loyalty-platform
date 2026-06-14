import "server-only";

import { prisma } from "@/lib/prisma";
import { getRequestInfo } from "@/lib/request-info";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export const LOGIN_LOCKOUT_MESSAGE =
  "Too many failed login attempts. Please wait 15 minutes and try again.";

function sinceWindow() {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
}

export async function isLoginTemporarilyLocked(email: string) {
  const { ipAddress } = await getRequestInfo();
  const since = sinceWindow();

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.failedLoginAudit.count({
      where: {
        emailAttempted: email,
        outcome: { in: ["FAILED", "LOCKED"] },
        createdAt: { gte: since },
      },
    }),
    prisma.failedLoginAudit.count({
      where: {
        ipAddress,
        outcome: { in: ["FAILED", "LOCKED"] },
        createdAt: { gte: since },
      },
    }),
  ]);

  return emailFailures >= MAX_FAILED_ATTEMPTS || ipFailures >= MAX_FAILED_ATTEMPTS;
}

export async function recordFailedLogin(email: string, outcome: "FAILED" | "LOCKED") {
  const { ipAddress, userAgent } = await getRequestInfo();
  await prisma.failedLoginAudit.create({
    data: {
      emailAttempted: email,
      ipAddress,
      userAgent,
      outcome,
    },
  });
}
