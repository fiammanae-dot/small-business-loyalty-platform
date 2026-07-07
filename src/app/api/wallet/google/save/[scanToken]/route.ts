import { NextResponse, type NextRequest } from "next/server";
import { createGoogleWalletSaveLink } from "@/lib/google-wallet/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tokenAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanToken: string }> },
) {
  const { scanToken } = await params;
  if (!/^scan_[A-Za-z0-9_-]{10,160}$/.test(scanToken)) {
    return unavailable("Invalid Google Wallet request.", 400);
  }

  const rateLimitKey = `${request.headers.get("x-forwarded-for") ?? "unknown"}:${scanToken}`;
  if (!allowRequest(rateLimitKey)) {
    return unavailable("Too many Google Wallet requests. Please try again in a minute.", 429);
  }

  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken },
    select: {
      id: true,
      status: true,
      scanStatus: true,
      businessCustomerMembership: {
        select: {
          status: true,
          cardStatus: true,
          business: { select: { status: true } },
        },
      },
      loyaltyProgram: { select: { active: true } },
    },
  });

  if (
    !programMembership ||
    programMembership.status !== "ACTIVE" ||
    programMembership.scanStatus !== "ACTIVE" ||
    programMembership.businessCustomerMembership.status !== "ACTIVE" ||
    programMembership.businessCustomerMembership.cardStatus !== "ACTIVE" ||
    programMembership.businessCustomerMembership.business.status !== "ACTIVE" ||
    !programMembership.loyaltyProgram.active
  ) {
    return unavailable("This loyalty card is not available for Google Wallet.", 404);
  }

  try {
    const { saveUrl } = await createGoogleWalletSaveLink(programMembership.id);
    return NextResponse.redirect(saveUrl, { status: 302 });
  } catch (error) {
    console.error("[google-wallet] save link failed", error);
    return unavailable("Google Wallet is temporarily unavailable for this loyalty card.", 503);
  }
}

function allowRequest(key: string) {
  const now = Date.now();
  const current = tokenAttempts.get(key);
  if (!current || current.resetAt <= now) {
    tokenAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

function unavailable(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Google Wallet | Loyalty Card UAE</title></head><body style="font-family:Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:24px;margin:0 0 12px">Google Wallet unavailable</h1><p style="line-height:1.6;color:#475569">${escapeHtml(message)}</p><a href="/" style="color:#f97316;font-weight:700">Return to Loyalty Card UAE</a></main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char] ?? char;
  });
}
