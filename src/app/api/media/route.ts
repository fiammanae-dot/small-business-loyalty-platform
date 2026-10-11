import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin copy of an image from the platform's own storage (R2).
 *
 * The web card draws the card photo with crossOrigin so the "Download" buttons
 * can turn the card into a PNG, which needs the storage to send CORS headers.
 * Serving the picture from our own domain removes that dependency: the photo
 * always shows, and the download always includes it. Only files under the
 * platform's own storage folders are served - never an arbitrary address.
 */
export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = ["wallet-photos/", "logos/", "stamp-icons/"];
const MAX_BYTES = 8 * 1024 * 1024;

function isProxiableMediaUrl(url: string): boolean {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return false;
  if (!url.startsWith(`${base}/`)) return false;
  const path = url.slice(base.length + 1);
  return ALLOWED_FOLDERS.some((folder) => path.startsWith(folder)) && !path.includes("..");
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("u") ?? "";
  if (!isProxiableMediaUrl(source)) return new NextResponse("Not found", { status: 404 });

  try {
    const response = await fetch(source, { cache: "force-cache" });
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!response.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) return new NextResponse("Not found", { status: 404 });
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": type,
        // Uploaded files get random names and never change.
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
