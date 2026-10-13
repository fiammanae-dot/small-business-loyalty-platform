import { BrandLockup } from "@/components/BrandLogo";

/** A discreet "Powered by" line with the brand lockup, for customer-facing posters. */
export function PoweredByBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B] ${className}`}>
      <span>Powered by</span>
      <BrandLockup className="h-7 w-auto" />
    </div>
  );
}
