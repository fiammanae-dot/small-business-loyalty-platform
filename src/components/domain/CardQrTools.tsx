import type { ReactNode } from "react";
import { SectionCard } from "@/components/ui";

export function CardQrTools({
  qr,
  title = "Loyalty card QR",
  actions,
}: {
  qr: ReactNode;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <SectionCard title={title} description="Show this QR code to staff when visiting the branch.">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-md border border-[#E2E8F0] bg-white p-3 shadow-sm">{qr}</div>
        {actions ? <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">{actions}</div> : null}
      </div>
    </SectionCard>
  );
}
