import { z } from "zod";

// Single source of truth for BusinessBranding field validation. Used by the
// platform admin business editor and the Business Owner Brand Assets Center so
// the two writers can never drift apart.

export const brandColorSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #F97316.");

// Accepts uploaded logos (site-relative /uploads/logos/... paths), legacy
// absolute URLs saved before uploads existed, or empty (no logo).
export const brandLogoUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || value.startsWith("/uploads/logos/") || /^https?:\/\/\S+$/i.test(value),
    "Upload a logo image or provide a valid logo URL.",
  )
  .optional();
