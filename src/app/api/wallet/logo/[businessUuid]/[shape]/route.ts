import { NextResponse, type NextRequest } from "next/server";
import { getBaseUrl } from "@/lib/customer-cards";
import { prisma } from "@/lib/prisma";
import { isPlatformLogoUrl, PASS_LOGO_MAX_BYTES, renderPassLogo, type PassLogoShape } from "@/lib/wallet/pass-logo";

// The brand logo, trimmed and sized for Apple ("wide") or Google ("square")
// Wallet. See src/lib/wallet/pass-logo.ts. Public on purpose: wallets fetch it.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ businessUuid: string; shape: string }> }) {
  const { businessUuid, shape: rawShape } = await params;
  const shape = rawShape.replace(/\.png$/i, "") as PassLogoShape;
  if (!UUID.test(businessUuid) || (shape !== "wide" && shape !== "square")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const business = await prisma.business.findUnique({
    where: { uuid: businessUuid },
    select: { branding: { select: { logoUrl: true } } },
  });
  const logoUrl = business?.branding?.logoUrl;
  if (!logoUrl) return new NextResponse("Not found", { status: 404 });

  const baseUrl = await getBaseUrl();
  const source = /^https?:\/\//i.test(logoUrl) ? logoUrl : `${baseUrl}/${logoUrl.replace(/^\/+/, "")}`;
  if (!isPlatformLogoUrl(source, baseUrl)) return NextResponse.redirect(source, { status: 302 });

  try {
    const response = await fetch(source, { cache: "force-cache" });
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!response.ok || !type.startsWith("image/")) throw new Error(`logo fetch ${response.status} ${type}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > PASS_LOGO_MAX_BYTES) throw new Error("logo size");
    const png = await renderPassLogo(bytes, shape);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // The URL carries ?v=<logo hash>, so a new logo is a new URL.
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    console.warn("[wallet-logo] could not prepare logo, serving the original", error);
    return NextResponse.redirect(source, { status: 302 });
  }
}
