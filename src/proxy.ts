import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/platform", "/branch", "/staff", "/scan"];

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))) {
    return applyNoStoreHeaders(response);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform/:path*", "/branch/:path*", "/staff/:path*", "/scan/:path*"],
};
