import type { CSSProperties } from "react";
import { drawStampStripSvg } from "@/lib/wallet/stamp-strip-svg";
import { findStampIcon, stampIconUrl } from "@/lib/wallet/stamp-icons";
import type { WalletPassBanner, WalletPassField, WalletPassView } from "@/lib/wallet-pass-view";
import { applePrimaryFields } from "@/lib/wallet-pass-view";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";

export type WalletPlatform = "apple" | "google";

/**
 * A customer's card exactly as Apple or Google Wallet lays it out.
 *
 * It renders a WalletPassView - the same object the Apple pass body is built
 * from - into the slots each wallet has: colour, logo and name, banner picture,
 * the label/value rows and the QR code. Nothing here is decorative beyond what
 * the wallets themselves draw, so the web card, the Design Studio preview and
 * the real pass match. No hooks: it renders on the server (the "Open Card"
 * page), in client previews, and inside image exports.
 */
export function WalletPassCard({
  view,
  platform,
  qrCode,
  className = "",
}: {
  view: WalletPassView;
  platform: WalletPlatform;
  /** A QR code image (data URL). Omitted in previews, which show a sample code. */
  qrCode?: string | null;
  className?: string;
}) {
  const cardStyle: CSSProperties = { backgroundColor: view.colors.background, color: view.colors.foreground };
  return platform === "apple" ? (
    <AppleCard view={view} qrCode={qrCode} style={cardStyle} className={className} />
  ) : (
    <GoogleCard view={view} qrCode={qrCode} style={cardStyle} className={className} />
  );
}

function AppleCard({ view, qrCode, style, className }: { view: WalletPassView; qrCode?: string | null; style: CSSProperties; className: string }) {
  const primary = applePrimaryFields(view);
  return (
    <div
      data-wallet-pass="apple"
      className={`w-full max-w-[340px] overflow-hidden rounded-[14px] ring-1 ring-black/5 shadow-[0_12px_30px_rgba(15,23,42,0.22)] ${className}`}
      style={{ ...style, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-2.5 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <PassLogo url={view.logoUrl} name={view.businessName} shape="square" />
          <span className="truncate text-[15px] font-semibold leading-tight">{view.businessName}</span>
        </div>
        <PassField field={view.header} muted={view.colors.muted} align="right" />
      </div>

      {view.banner ? (
        // Apple's store-card strip is 375 x 144 and centre-crops what it is given.
        <div className="aspect-[375/144] w-full overflow-hidden">
          <BannerImage banner={view.banner} alt={`${view.title} banner`} />
        </div>
      ) : (
        <div className="px-4 pb-1 pt-3">
          {primary.map((field, index) => (
            <PassField key={index} field={field} muted={view.colors.muted} size="primary" />
          ))}
        </div>
      )}

      {view.secondaryFields.length ? (
        <div className="flex items-start justify-between gap-3 px-4 pt-3">
          {view.secondaryFields.map((field, index) => (
            <PassField
              key={index}
              field={field}
              muted={view.colors.muted}
              align={index === view.secondaryFields.length - 1 && index > 0 ? "right" : "left"}
            />
          ))}
        </div>
      ) : null}

      <div className="flex justify-center px-4 pb-4 pt-5">
        <PassBarcode qrCode={qrCode} altText={view.barcodeAltText} rounded="rounded-lg" />
      </div>
    </div>
  );
}

function GoogleCard({ view, qrCode, style, className }: { view: WalletPassView; qrCode?: string | null; style: CSSProperties; className: string }) {
  const rows = [view.google.primary, view.google.secondary].filter((field): field is WalletPassField => Boolean(field));
  return (
    <div
      data-wallet-pass="google"
      className={`w-full max-w-[340px] overflow-hidden rounded-[24px] ring-1 ring-black/5 shadow-[0_12px_30px_rgba(15,23,42,0.22)] ${className}`}
      style={{ ...style, fontFamily: "'Google Sans', Roboto, 'Segoe UI', Arial, sans-serif" }}
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <PassLogo url={view.logoUrl} name={view.businessName} shape="circle" />
        <span className="min-w-0 truncate text-sm font-medium">{view.businessName}</span>
      </div>
      <p className="px-5 pt-4 text-[22px] leading-tight">{view.title}</p>

      <div className="grid grid-cols-2 gap-4 px-5 pt-4">
        {rows.map((field, index) => (
          <PassField key={index} field={field} muted={view.colors.muted} casing="normal" />
        ))}
      </div>
      <div className="px-5 pt-3">
        <PassField field={{ label: "Member", value: view.customerName }} muted={view.colors.muted} casing="normal" />
      </div>

      <div className="flex justify-center px-5 pb-5 pt-5">
        <PassBarcode qrCode={qrCode} altText={view.barcodeAltText} rounded="rounded-2xl" />
      </div>

      {view.banner ? (
        // Google's hero image sits at the bottom of the pass at 1032 x 336.
        <div className="aspect-[1032/336] w-full overflow-hidden">
          <BannerImage banner={view.banner} alt={`${view.title} picture`} />
        </div>
      ) : null}
    </div>
  );
}

function PassField({
  field,
  muted,
  align = "left",
  size = "regular",
  casing = "upper",
}: {
  field: WalletPassField;
  muted: string;
  align?: "left" | "right";
  size?: "regular" | "primary";
  casing?: "upper" | "normal";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      {field.label ? (
        <p
          className={casing === "upper" ? "text-[10px] font-semibold uppercase tracking-[0.06em]" : "text-xs"}
          style={{ color: muted }}
        >
          {field.label}
        </p>
      ) : null}
      <p className={`${size === "primary" ? "text-[30px] font-light leading-tight" : "text-[15px] leading-snug"} truncate`}>{field.value}</p>
    </div>
  );
}

function PassLogo({ url, name, shape }: { url: string | null; name: string; shape: "square" | "circle" }) {
  // The shared avatar falls back to initials when the logo is missing or fails
  // to load, so a pass never shows a broken image where the logo goes.
  return (
    <BusinessLogoAvatar
      logoUrl={url}
      businessName={name}
      size="xs"
      className={`bg-white text-[#111827] ${shape === "circle" ? "rounded-full" : "rounded-md"}`}
    />
  );
}

function BannerImage({ banner, alt }: { banner: WalletPassBanner; alt: string }) {
  if (banner.kind === "stamps") {
    // Drawn inline (an <img>-loaded SVG may not fetch the icon picture) with
    // the same function and layout as the wallet's stamp picture.
    const iconHref = banner.customIconUrl ?? stampIconUrl(findStampIcon(banner.emoji));
    const svg = drawStampStripSvg(banner.filled, banner.total, iconHref).replace(
      /<svg ([^>]*?)width="\d+" height="\d+"/,
      '<svg $1width="100%" height="100%" preserveAspectRatio="xMidYMid slice"',
    );
    return <div role="img" aria-label={alt} className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={banner.url} alt={alt} className="h-full w-full object-cover" crossOrigin="anonymous" />
  );
}

function PassBarcode({ qrCode, altText, rounded }: { qrCode?: string | null; altText: string; rounded: string }) {
  return (
    <div className={`bg-white px-3 pb-2 pt-3 text-center ${rounded}`}>
      {qrCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrCode} alt="Scan code" className="h-[120px] w-[120px]" />
      ) : (
        <SampleQr />
      )}
      <p className="mt-1 text-[11px] text-[#111827]">{altText}</p>
    </div>
  );
}

/** A stand-in QR for previews (no customer, so no real code to encode). */
function SampleQr() {
  const cells = 21;
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
  const rects: string[] = [];
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      if (finder(x, y)) continue;
      // Deterministic speckle so server and client render the same picture.
      if (((x * 7 + y * 13 + x * y) % 5) < 2) rects.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  const finderPath = (ox: number, oy: number) =>
    `M${ox} ${oy}h7v7h-7zM${ox + 1} ${oy + 1}v5h5v-5zM${ox + 2} ${oy + 2}h3v3h-3z`;
  return (
    <svg viewBox={`0 0 ${cells} ${cells}`} className="h-[120px] w-[120px]" role="img" aria-label="Sample QR code">
      <path d={rects.join("")} fill="#111827" />
      <path d={finderPath(0, 0) + finderPath(cells - 7, 0) + finderPath(0, cells - 7)} fill="#111827" fillRule="evenodd" />
    </svg>
  );
}
