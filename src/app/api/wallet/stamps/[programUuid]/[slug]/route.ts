import { NextResponse, type NextRequest } from "next/server";
import { drawStampStripPng } from "@/lib/wallet/stamp-image";
import { prisma } from "@/lib/prisma";
import { customStampIconForDesign, stampEmojiForDesign } from "@/lib/stamp-icon-marks";

/**
 * Serves the stamp picture that a wallet card points at.
 *
 * Drawn on demand rather than generated ahead of time and stored: the count in
 * the path decides the picture entirely, so there is nothing to keep in sync,
 * nothing to clean up when a program changes, and no stale file left behind.
 *
 * Public by design. Google's servers fetch this, not the customer's browser, so
 * it cannot carry a session. It leaks nothing: a stamp count and an icon, with
 * no customer attached.
 */
export const dynamic = "force-dynamic";

const SLUG = /^(\d{1,2})-of-(\d{1,2})-([0-9a-f-]{1,32})\.png$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programUuid: string; slug: string }> },
) {
  const { programUuid, slug } = await params;
  const match = SLUG.exec(slug);
  if (!match) return new NextResponse("Not found", { status: 404 });

  const earned = Number(match[1]);
  const total = Number(match[2]);

  // The icon comes from the program's card design (the same one the web card
  // shows), never from the URL - the tag in the path only exists to change the
  // address when a business picks a new icon, so the wallet refetches instead of
  // serving what it cached.
  const program = await prisma.loyaltyProgram.findUnique({
    where: { uuid: programUuid },
    select: { cardDesign: true, requiredStamps: true },
  });
  if (!program) return new NextResponse("Not found", { status: 404 });

  const customIcon = await loadCustomStampIcon(customStampIconForDesign(program.cardDesign));
  const png = await drawStampStripPng(earned, total || program.requiredStamps, stampEmojiForDesign(program.cardDesign), customIcon);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // The path pins every input, so this address can never mean anything else.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

const CUSTOM_ICON_MAX_BYTES = 1024 * 1024;

/**
 * An uploaded stamp icon, as a data: URL the PNG renderer can embed (it does
 * not fetch). Only images in the platform's own storage are fetched - never an
 * arbitrary address - and any failure falls back to the built-in icon.
 */
async function loadCustomStampIcon(url: string | null): Promise<string | null> {
  if (!url) return null;
  const storageBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (!storageBase || !url.startsWith(`${storageBase}/stamp-icons/`)) return null;
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!/^image\/(png|webp)$/.test(type.split(";")[0].trim())) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > CUSTOM_ICON_MAX_BYTES) return null;
    return `data:${type.split(";")[0].trim()};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
