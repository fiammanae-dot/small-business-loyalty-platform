import { NextResponse, type NextRequest } from "next/server";
import { getGoogleWalletConfig } from "@/lib/google-wallet/config";
import { createGoogleCashbackSaveLink } from "@/lib/google-wallet/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The cashback card for Google Wallet (Android) - the twin of
// /api/wallet/apple/cashback/<cardToken>. Only cashback members get one.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

export async function GET(request: NextRequest, { params }: { params: Promise<{ cardToken: string }> }) {
  const { cardToken } = await params;
  if (!/^cst_[A-Za-z0-9_-]{10,200}$/.test(cardToken)) {
    return unavailable("Invalid cashback card request.", 400);
  }
  if (!getGoogleWalletConfig()) {
    return unavailable("Google Wallet is not enabled for this platform yet.", 404);
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
      cashbackJoinedAt: true,
      business: { select: { status: true, cashbackSettings: { select: { enabled: true } } } },
    },
  });

  if (!customer || customer.status !== "ACTIVE" || customer.cardStatus !== "ACTIVE" || customer.business.status !== "ACTIVE") {
    return unavailable("This cashback card is not available for Google Wallet.", 404);
  }
  if (!customer.business.cashbackSettings?.enabled) {
    return unavailable("Cashback is not enabled for this business.", 404);
  }
  if (!customer.cashbackJoinedAt) {
    return unavailable("Join the cashback program first to get the cashback card.", 404);
  }

  try {
    const { saveUrl } = await createGoogleCashbackSaveLink(customer.id);
    return NextResponse.redirect(saveUrl, { status: 302 });
  } catch (error) {
    console.error("[google-wallet] cashback save link failed", error);
    return unavailable("The cashback card is temporarily unavailable.", 503);
  }
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
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cashback card | Loyalty Card UAE</title></head><body style="font-family:Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:24px;margin:0 0 12px">Cashback card unavailable</h1><p style="line-height:1.6;color:#475569">${escapeHtml(message)}</p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
