import bcrypt from "bcryptjs";
import type { AuthUser } from "@/lib/session";

export const devFallbackUser: AuthUser = {
  id: 0,
  uuid: "00000000-0000-0000-0000-000000000000",
  name: "System Administrator",
  email: process.env.DEV_AUTH_EMAIL ?? "",
  role: "PLATFORM_OWNER",
  businessId: null,
  businessStatus: null,
  branchId: null,
  forcePasswordChange: false,
};

export function isDevAuthFallbackEnabled() {
  // This fallback exists only for local database setup. It is explicitly
  // disabled in production even if DEV_AUTH_FALLBACK is accidentally set.
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_FALLBACK === "true" &&
    Boolean(process.env.DEV_AUTH_EMAIL) &&
    Boolean(process.env.DEV_AUTH_PASSWORD_HASH)
  );
}

export async function verifyDevFallbackCredentials(email: string, password: string) {
  if (!isDevAuthFallbackEnabled() || email !== devFallbackUser.email) {
    return false;
  }

  return bcrypt.compare(password, process.env.DEV_AUTH_PASSWORD_HASH ?? "");
}
