import "server-only";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * The access trail: which device, network and city each sign-in and scan came
 * from. It is what lets the platform notice one paid branch being used in two
 * shops. Nothing here ever blocks a sign-in or a scan - a failure to record is
 * swallowed.
 *
 * The device id is a random id kept in a long-lived cookie, one per browser
 * (src/proxy.ts sets it on the workspace pages, createSession on sign-in). It
 * identifies a phone or tablet, not a person; clearing the browser's cookies
 * gives it a new id.
 *
 * The city comes from Vercel's IP geolocation headers. It is approximate:
 * mobile networks can place a phone in a neighbouring emirate, so it is a
 * signal for review, never proof.
 */
export const DEVICE_COOKIE = "lc_device";
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type AccessContext = {
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  ipCity: string | null;
  ipCountry: string | null;
  ipLatitude: number | null;
  ipLongitude: number | null;
};

export function isDeviceId(value: string | null | undefined): value is string {
  return typeof value === "string" && DEVICE_ID.test(value);
}

function clip(value: string | null | undefined, max: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function decodeCity(value: string | null) {
  if (!value) return null;
  try {
    return clip(decodeURIComponent(value), 120);
  } catch {
    return clip(value, 120);
  }
}

function coordinate(value: string | null, limit: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

/** Reads the device, network and city of the current request. */
export async function readAccessContext(): Promise<AccessContext> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const device = cookieStore.get(DEVICE_COOKIE)?.value;
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || headerStore.get("x-real-ip");
  return {
    deviceId: isDeviceId(device) ? device : null,
    ipAddress: clip(ip, 64),
    userAgent: clip(headerStore.get("user-agent"), 300),
    ipCity: decodeCity(headerStore.get("x-vercel-ip-city")),
    ipCountry: clip(headerStore.get("x-vercel-ip-country"), 8),
    ipLatitude: coordinate(headerStore.get("x-vercel-ip-latitude"), 90),
    ipLongitude: coordinate(headerStore.get("x-vercel-ip-longitude"), 180),
  };
}

/**
 * Makes sure this browser has a device id. Only callable where cookies can be
 * written (server actions, route handlers).
 */
export async function ensureDeviceIdCookie(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEVICE_COOKIE)?.value;
  if (isDeviceId(existing)) return existing;
  const deviceId = randomUUID();
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
  return deviceId;
}

/** Records a successful sign-in. Never throws. */
export async function recordLoginEvent(userId: number) {
  try {
    const deviceId = await ensureDeviceIdCookie();
    const [context, user] = await Promise.all([
      readAccessContext(),
      prisma.user.findUnique({ where: { id: userId }, select: { businessId: true, branchId: true } }),
    ]);
    if (!user) return;
    await prisma.loginEvent.create({
      data: { userId, businessId: user.businessId, branchId: user.branchId, ...context, deviceId },
    });
  } catch (error) {
    console.error("Could not record the sign-in", error);
  }
}

/** The access fields stored on a scan event. Never throws. */
export async function scanAccessFields(): Promise<AccessContext | Record<string, never>> {
  try {
    return await readAccessContext();
  } catch {
    return {};
  }
}
