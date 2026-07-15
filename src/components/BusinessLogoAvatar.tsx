"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The single shared business-logo renderer. Shows the logo image when it
 * exists AND actually loads; otherwise falls back to the business initial.
 * A broken or unreachable logo URL therefore never produces a blank circle
 * or a broken-image icon anywhere in the app.
 */
export function BusinessLogoAvatar({
  logoUrl,
  businessName,
  className = "h-12 w-12",
  style,
  fallback,
}: {
  logoUrl?: string | null;
  businessName: string;
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
      className={`grid shrink-0 place-items-center overflow-hidden font-black ${className}`}
      style={style}
      aria-label={`${businessName} logo`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={logoUrl as string} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
