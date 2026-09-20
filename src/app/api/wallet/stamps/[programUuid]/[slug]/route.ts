import { NextResponse, type NextRequest } from "next/server";
import { drawStampStripPng } from "@/lib/wallet/stamp-image";
import { prisma } from "@/lib/prisma";

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

const SLUG = /^(\d{1,2})-of-(\d{1,2})-([0-9a-f-]{1,24})\.png$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programUuid: string; slug: string }> },
) {
  const { programUuid, slug } = await params;
  const match = SLUG.exec(slug);
  if (!match) return new NextResponse("Not found", { status: 404 });

  const earned = Number(match[1]);
  const total = Number(match[2]);

  // The emoji comes from the program, never from the URL - the tag in the path
  // only exists to change the address when a business picks a new icon, so that
  // Google refetches instead of serving what it cached.
  const program = await prisma.loyaltyProgram.findUnique({
    where: { uuid: programUuid },
    select: { stampEmoji: true, requiredStamps: true },
  });
  if (!program) return new NextResponse("Not found", { status: 404 });

  const png = await drawStampStripPng(earned, total || program.requiredStamps, program.stampEmoji);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // The path pins every input, so this address can never mean anything else.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
