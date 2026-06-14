import "server-only";

import { headers } from "next/headers";

export async function getRequestInfo() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

  return {
    ipAddress,
    userAgent: headerStore.get("user-agent"),
  };
}
