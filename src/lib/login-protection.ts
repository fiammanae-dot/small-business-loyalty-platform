import "server-only";

import { prisma } from "@/lib/prisma";
import { isOverThreshold, windowStart } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export const LOGIN_LOCKOUT_MESSAGE =
  "Too many failed login attempts. Please wait 15 minutes and try again.";

export async function isLoginTemporarilyLocked(email: string) {
  const { ipAddress } = await getRequestInfo();
  const since = windowStart(WINDOW_MINUTES);

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

  return isOverThreshold(emailFailures, MAX_FAILED_ATTEMPTS) || isOverThreshold(ipFailures, MAX_FAILED_ATTEMPTS);
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
