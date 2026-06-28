import Link from "next/link";
import { PrintPageButton } from "@/components/PrintPageButton";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { getProgramJoinQrDataUrl } from "@/lib/program-join";
import { prisma } from "@/lib/prisma";

export default async function ProgramJoinPosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: id, businessId: user.businessId },
    select: {
      name: true,
      rewardName: true,
      rewardDescription: true,
      requiredStamps: true,
      active: true,
      joinToken: true,
      business: { select: { name: true, status: true, branding: true } },
    },
  });

  if (!program) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-[#111827]">
        <section className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Program not found</h1>
          <p className="mt-3 text-sm text-[#64748B]">This program may have been removed or does not belong to your business.</p>
          <Link href="/dashboard/programs" className="mt-5 inline-flex h-10 items-center rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold">
            Back to Programs
          </Link>
        </section>
      </main>
    );
  }

  const brandColor = program.business.branding?.buttonColor ?? program.business.branding?.primaryColor ?? "#F97316";
  const qrCode = await getProgramJoinQrDataUrl(program.joinToken);
  const unavailable = !program.active || program.business.status !== "ACTIVE";

  return (
    <main className="min-h-screen bg-[#FFF7ED] px-4 py-6 text-[#111827] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex w-full max-w-3xl items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/programs" className="text-sm font-semibold text-[#475569] hover:text-[#0F172A]">
          Back to Programs
        </Link>
        <PrintPageButton />
      </div>

      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[36px] border border-orange-100 bg-white shadow-2xl shadow-orange-200/40 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="px-8 py-8 text-center text-white sm:px-12" style={{ backgroundColor: brandColor }}>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/80">LoyaltyBase</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">Scan to join</h1>
          <p className="mt-4 text-xl font-semibold text-white/90">{business.name}</p>
        </div>

        <div className="grid gap-8 px-8 py-10 text-center sm:px-12">
          {unavailable ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              This poster is for preview only because the program or business is not currently active.
            </div>
          ) : null}

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#F97316]">Join our loyalty program</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#0F172A]">{program.name}</h2>
            <p className="mt-3 text-lg font-semibold text-[#475569]">{program.rewardName}</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">{program.rewardDescription}</p>
          </div>

          <div className="mx-auto rounded-[32px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <img src={qrCode} alt={`${program.name} join QR code`} className="h-72 w-72 rounded-2xl bg-white" />
          </div>

          <div className="mx-auto max-w-xl rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
            <p className="text-2xl font-black text-[#0F172A]">Scan to join our loyalty program</p>
            <p className="mt-3 text-base leading-7 text-[#475569]">
              Enter your name and phone number, then show your digital loyalty card at checkout.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#64748B]">{program.requiredStamps} visits to unlock your next reward.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
