import { NextResponse } from "next/server";
import { validateCsrfForm } from "@/lib/csrf";
import { destroySession } from "@/lib/session";

function logoutRedirect(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}

export async function POST(request: Request) {
  try {
    validateCsrfForm(await request.formData(), "logout");
  } catch {
    return logoutRedirect(request);
  }

  await destroySession();
  return logoutRedirect(request);
}
