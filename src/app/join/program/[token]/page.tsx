import Link from "next/link";
import { joinProgramAction } from "@/app/join/program/[token]/actions";
import { BusinessBrandingProvider } from "@/components/BusinessBrandingProvider";
import { resolveBusinessBranding } from "@/lib/business-branding";
import { getCardUrl } from "@/lib/customer-cards";
import { prisma } from "@/lib/prisma";

export default async function ProgramJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ card?: string; error?: string }>;
}) {
  const { token } = await params;
  const qs = await searchParams;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
  const program = isUuid
    ? await prisma.loyaltyProgram.findUnique({
        where: { joinToken: token },
        include: { business: { select: { name: true, status: true, branding: true } } },
      })
    : null;

  if (!program || !program.active || program.business.status !== "ACTIVE") {
    return <JoinUnavailable />;
  }

  const successMembership = qs.card
    ? await prisma.businessCustomerMembership.findFirst({
        where: {
          cardToken: qs.card,
          businessId: program.businessId,
          status: "ACTIVE",
          programMemberships: { some: { loyaltyProgramId: program.id } },
        },
      })
    : null;
  const successCardUrl = successMembership ? await getCardUrl(successMembership.cardToken) : null;
  const branding = resolveBusinessBranding(program.business.branding);

  return (
    <BusinessBrandingProvider branding={branding}>
      <main className="min-h-screen px-4 py-8" style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}>
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-2xl shadow-slate-200/60">
        <div className="business-bg px-6 py-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-current opacity-80">Join loyalty program</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{program.business.name}</h1>
          <p className="mt-2 text-lg font-semibold text-current opacity-90">{program.name}</p>
        </div>

        {successMembership && successCardUrl ? (
          <div className="p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">You're in</p>
              <h2 className="mt-2 text-2xl font-bold text-emerald-950">
                Welcome, {successMembership.firstName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Your digital loyalty card is ready. Show it at checkout so staff can add stamps.
              </p>
            </div>
            <Link
              href={successCardUrl}
              className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl business-button px-5 text-sm font-bold"
            >
              Open My Loyalty Card
            </Link>
            <p className="mt-3 break-all rounded-xl bg-[#F8FAFC] p-3 text-xs text-[#64748B]">{successCardUrl}</p>
          </div>
        ) : (
          <div className="p-6">
            {qs.error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {qs.error}
              </p>
            ) : null}
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
              <p className="text-sm font-semibold text-[#0F172A]">{program.rewardName}</p>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">{program.rewardDescription}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                {program.requiredStamps} visits required
              </p>
            </div>

            <form action={joinProgramAction} className="mt-5 grid gap-4">
              <input type="hidden" name="token" value={token} />
              <Input label="First name" name="firstName" autoComplete="given-name" required />
              <Input label="Last name" name="lastName" autoComplete="family-name" />
              <Input label="Phone number" name="phone" autoComplete="tel" required placeholder="0501234567" />
              <p className="text-xs leading-5 text-[#64748B]">
                We use your phone number to find or create your customer profile for this business only.
              </p>
              <button
                type="submit"
                className="min-h-12 rounded-xl business-button px-5 text-sm font-bold transition hover:brightness-95"
              >
                Join Program
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
    </BusinessBrandingProvider>
  );
}

function Input({
  label,
  name,
  required = false,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      <input
        name={name}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm font-normal outline-none transition business-ring focus:ring-0"
      />
    </label>
  );
}

function JoinUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8FAFC] text-sm font-bold text-[#111827]">
          LC
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Program not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          This loyalty program link is unavailable or has been disabled.
        </p>
      </section>
    </main>
  );
}
