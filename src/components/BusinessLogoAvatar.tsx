"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type BusinessLogoAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<BusinessLogoAvatarSize, string> = {
  xs: "h-8 w-8 text-xs",
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-14 w-14 text-xl",
  xl: "h-20 w-20 text-3xl",
};

/**
 * The single shared business-logo renderer. Shows the logo image when it
 * exists AND actually loads; otherwise falls back to the business initials in
 * the same box, colours, and radius. A broken or unreachable logo URL
 * therefore never produces a blank circle or a broken-image icon anywhere.
 *
 * Sizing comes from the `size` variant; `className` carries shape and colour
 * (e.g. rounded-full, background, ring) so every call site stays consistent.
 */
export function BusinessLogoAvatar({
  logoUrl,
  businessName,
  size = "md",
  className = "",
  style,
  fallback,
}: {
  logoUrl?: string | null;
  businessName: string;
  size?: BusinessLogoAvatarSize;
  className?: string;
  style?: CSSProperties;
  fallback?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset when the URL changes, and catch images that already failed before
    // hydration (the error event fires before React attaches onError, so a
    // server-rendered broken logo would otherwise slip through).
    const img = imgRef.current;
    setFailed(Boolean(img && img.complete && img.naturalWidth === 0));
  }, [logoUrl]);

  const showImage = Boolean(logoUrl) && !failed;
  const initials = fallback ?? businessName.slice(0, 1).toUpperCase();

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden font-black ${sizeClasses[size]} ${className}`}
      style={style}
      aria-label={`${businessName} logo`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={logoUrl as string}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
