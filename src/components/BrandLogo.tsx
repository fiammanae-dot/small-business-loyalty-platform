import Image from "next/image";

/**
 * The Loyalty Card UAE brand: the ring-and-dot symbol with the "loyalty card /
 * uae" wordmark. The artwork is the brand's own (public/brand/); the dark
 * version is for light backgrounds, the white version for dark ones.
 */
const LOCKUP = { width: 983, height: 198 } as const;

export function BrandLockup({ tone = "dark", className = "h-9 w-auto", priority = false }: { tone?: "dark" | "light"; className?: string; priority?: boolean }) {
  return (
    <Image
      src={tone === "light" ? "/brand/loyalty-card-uae-white.png" : "/brand/loyalty-card-uae.png"}
      alt="Loyalty Card UAE"
      width={LOCKUP.width}
      height={LOCKUP.height}
      priority={priority}
      className={className}
    />
  );
}

/** The symbol on its own: a ring in the current text colour with the orange dot. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="326 204 192 192" className={className} aria-hidden="true" focusable="false">
      <circle cx="421.5" cy="299.5" r="88.5" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="485" cy="236.5" r="24" fill="#F26A21" />
    </svg>
  );
}
