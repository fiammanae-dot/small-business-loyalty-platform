/**
 * The Loyalty Card UAE brand, from the brand kit in public/brand/ (vector, so
 * it is sharp at every size):
 *
 * - BrandLockup: the ring-and-dot symbol with the "loyalty card / uae"
 *   wordmark, beside it (horizontal) or above it (stacked).
 * - BrandMark: the symbol on its own.
 *
 * `tone` picks the version for the background it sits on: "dark" artwork for
 * light backgrounds, "light" for dark ones, "on-orange" for brand orange.
 */
export type BrandTone = "dark" | "light" | "on-orange";

const LOCKUP = {
  horizontal: { width: 1019, height: 204, dark: "full-colour", light: "white", "on-orange": "on-orange" },
  stacked: { width: 583, height: 412, dark: "full-colour", light: "white", "on-orange": "on-orange" },
} as const;

export function BrandLockup({
  tone = "dark",
  variant = "horizontal",
  className = "h-9 w-auto",
  priority = false,
}: {
  tone?: BrandTone;
  variant?: "horizontal" | "stacked";
  className?: string;
  priority?: boolean;
}) {
  const art = LOCKUP[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from the brand kit; next/image adds nothing for vectors
    <img
      src={`/brand/logo-${variant}-${art[tone]}.svg`}
      alt="Loyalty Card UAE"
      width={art.width}
      height={art.height}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
}

const MARK_DOT: Record<BrandTone, string> = { dark: "#F26A21", light: "#F26A21", "on-orange": "#141210" };

/** The symbol alone. The ring takes the current text colour; the dot is brand orange (ink on orange). */
export function BrandMark({ className = "h-8 w-8", tone = "dark" }: { className?: string; tone?: BrandTone }) {
  return (
    <svg viewBox="4 4 56 56" className={className} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="47.56" cy="16.44" r="6" fill={MARK_DOT[tone]} />
    </svg>
  );
}
