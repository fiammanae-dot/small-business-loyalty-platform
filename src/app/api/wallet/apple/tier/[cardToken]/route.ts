import { NextResponse, type NextRequest } from "next/server";
import { syncAppleTierPass } from "@/lib/walletwallet/service";
import { isWalletWalletConfigured } from "@/lib/walletwallet/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

export async function GET(request: NextRequest, { params }: { params: Promise<{ cardToken: string }> }) {
  const { cardToken } = await params;
  if (!/^cst_[A-Za-z0-9_-]{10,200}$/.test(cardToken)) {
    return unavailable("Invalid tier card request.", 400);
  }
  if (!isWalletWalletConfigured()) {
    return unavailable("Apple Wallet is not enabled for this platform yet.", 404);
  }

  const key = `${request.headers.get("x-forwarded-for") ?? "unknown"}:${cardToken}`;
  if (!allowRequest(key)) {
    return unavailable("Too many requests. Please try again in a minute.", 429);
  }

  const customer = await prisma.businessCustomerMembership.findUnique({
    where: { cardToken },
    select: {
      id: true,
      status: true,
      cardStatus: true,
      business: { select: { status: true, tierSetting: { select: { id: true } } } },
    },
  });

  if (
    !customer ||
    customer.status !== "ACTIVE" ||
    customer.cardStatus !== "ACTIVE" ||
    customer.business.status !== "ACTIVE"
  ) {
    return unavailable("This tier card is not available for Apple Wallet.", 404);
  }
  if (!customer.business.tierSetting) {
    return unavailable("Tiers are not set up for this business.", 404);
  }

  const result = await syncAppleTierPass(customer.id);
  if (!result.ok) {
    console.error("[apple-wallet] tier pass sync failed", result);
    return unavailable("The tier card is temporarily unavailable.", 503);
  }
  return NextResponse.redirect(result.shareUrl, { status: 302 });
}

function allowRequest(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

function unavailable(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tier card | Loyalty Card UAE</title></head><body style="font-family:Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:24px;margin:0 0 12px">Tier card unavailable</h1><p style="line-height:1.6;color:#475569">${escapeHtml(message)}</p><a href="/" style="color:#f97316;font-weight:700">Return to Loyalty Card UAE</a></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] ?? c));
}
