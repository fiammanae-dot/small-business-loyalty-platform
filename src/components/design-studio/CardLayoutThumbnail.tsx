import type { CardSectionVisibility } from "@/lib/card-design";

export function CardLayoutThumbnail({ visibleSections }: { visibleSections: CardSectionVisibility }) {
  return (
    <span className="block rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {visibleSections.logo ? <span className="h-7 w-7 rounded-full business-bg" /> : null}
          <span className="grid gap-1">
            {visibleSections.businessName ? <span className="h-2 w-16 rounded-full bg-[#111827]" /> : null}
            {visibleSections.programName ? <span className="h-1.5 w-12 rounded-full bg-[#CBD5E1]" /> : null}
          </span>
        </span>
        {visibleSections.tierBadge ? <span className="h-5 w-10 rounded-full bg-[#E2E8F0]" /> : null}
      </span>
      {visibleSections.customerName ? <span className="mt-4 block h-3 w-24 rounded-full bg-[#64748B]" /> : null}
      {visibleSections.rewardBox ? <span className="mt-3 block h-8 rounded-xl bg-white shadow-sm" /> : null}
      {visibleSections.progress ? <span className="mt-3 block h-2 rounded-full business-bg" /> : null}
      <span className="mt-3 flex items-center justify-between gap-2">
        {visibleSections.visits ? <span className="h-2 w-14 rounded-full bg-[#CBD5E1]" /> : <span />}
        {visibleSections.qr ? <span className="h-8 w-8 rounded-lg bg-[#111827]" /> : null}
      </span>
      {visibleSections.footer || visibleSections.referral ? <span className="mt-3 block h-2 w-full rounded-full bg-[#E2E8F0]" /> : null}
    </span>
  );
}
