import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/platform", "/branch", "/staff", "/scan", "/change-password"];

// Same name, lifetime and format as src/lib/access-trail.ts (which cannot be
// imported here: it is server-only and reads the database).
const DEVICE_COOKIE = "lc_device";
const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
}

/**
 * Gives every browser that opens a workspace page a device id, so scans can be
 * told apart by device (plan compliance). The id is also handed to this same
 * request, so the very first scan from a new phone is already recorded with it.
 */
function withDeviceId(request: NextRequest) {
  if (DEVICE_ID.test(request.cookies.get(DEVICE_COOKIE)?.value ?? "")) return NextResponse.next();
  const deviceId = crypto.randomUUID();
  request.cookies.set(DEVICE_COOKIE, deviceId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
  return response;
}

export function proxy(request: NextRequest) {
  const response = withDeviceId(request);

  if (protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))) {
    return applyNoStoreHeaders(response);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform/:path*", "/branch/:path*", "/staff/:path*", "/scan/:path*", "/change-password"],
};
