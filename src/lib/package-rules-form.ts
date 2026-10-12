import { z } from "zod";
import type { PackageRules } from "@/lib/membership-sessions";

/**
 * The "Package rules" form, shared by package creation and the program page.
 *
 * Fields (all plain radios/inputs so the form works without JavaScript):
 *   packageLifetime      "lifetime" | "expiry"
 *   packageExpiryRule    "MONTHLY_FORFEIT" | "FIXED_TERM"   (only with "expiry")
 *   packageTermMonths    1-60                               (only with FIXED_TERM)
 *   packageVisitsPerMonth "many" | "one"
 *   packageTreatments    "repeat" | "once"
 */
const packageRulesFormSchema = z
  .object({
    packageLifetime: z.enum(["lifetime", "expiry"], { message: "Choose whether the package expires." }),
    packageExpiryRule: z.enum(["MONTHLY_FORFEIT", "FIXED_TERM"]).optional(),
    packageTermMonths: z.coerce.number().int().optional(),
    packageVisitsPerMonth: z.enum(["many", "one"], { message: "Choose how many visits a month are allowed." }),
    packageTreatments: z.enum(["repeat", "once"], { message: "Choose whether treatments can be repeated." }),
  })
  .refine((data) => data.packageLifetime === "lifetime" || Boolean(data.packageExpiryRule), {
    message: "Choose the expiry rule for this package.",
  })
  .refine(
    (data) =>
      data.packageLifetime === "lifetime" ||
      data.packageExpiryRule !== "FIXED_TERM" ||
      (data.packageTermMonths !== undefined && data.packageTermMonths >= 1 && data.packageTermMonths <= 60),
    { message: "Enter how many months the package lasts (1 to 60)." },
  );

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parsePackageRulesForm(
  formData: FormData,
  context: { includedVisits: number; treatmentCount: number },
): { ok: true; rules: PackageRules } | { ok: false; message: string } {
  const parsed = packageRulesFormSchema.safeParse({
    packageLifetime: field(formData, "packageLifetime"),
    packageExpiryRule: field(formData, "packageExpiryRule"),
    packageTermMonths: field(formData, "packageTermMonths"),
    packageVisitsPerMonth: field(formData, "packageVisitsPerMonth"),
    packageTreatments: field(formData, "packageTreatments"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Package rules are invalid." };
  const data = parsed.data;

  const rules: PackageRules = {
    packageValidity: data.packageLifetime === "lifetime" ? "LIFETIME" : (data.packageExpiryRule ?? "MONTHLY_FORFEIT"),
    packageTermMonths: data.packageLifetime === "expiry" && data.packageExpiryRule === "FIXED_TERM" ? (data.packageTermMonths ?? null) : null,
    packageOneVisitPerMonth: data.packageVisitsPerMonth === "one",
    packageUniqueTreatments: data.packageTreatments === "once",
  };

  // "Only once each" with fewer treatments than visits would leave visits the
  // customer paid for but can never use.
  if (rules.packageUniqueTreatments && context.treatmentCount < context.includedVisits) {
    return {
      ok: false,
      message: `With "each treatment only once", add at least ${context.includedVisits} treatments (one for each included visit), or allow repeats.`,
    };
  }
  return { ok: true, rules };
}
