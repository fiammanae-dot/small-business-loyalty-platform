import Link from "next/link";
import { joinCashbackProgramAction } from "@/app/join/cashback/[token]/actions";
import { BusinessBrandingProvider } from "@/components/BusinessBrandingProvider";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { resolveBusinessBranding } from "@/lib/business-branding";
import { getCardUrl } from "@/lib/customer-cards";
import { prisma } from "@/lib/prisma";

// Public join page for the cashback program - the cashback twin of
// /join/program/<token>, reached from the cashback join QR or link.
export default async function CashbackJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    card?: string;
    error?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    birthday?: string;
  }>;
}) {
  const { token } = await params;
  const qs = await searchParams;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
  const settings = isUuid
    ? await prisma.businessCashbackSettings.findUnique({
        where: { joinToken: token },
        include: { business: { select: { name: true, status: true, branding: true } } },
      })
    : null;

  if (!settings?.enabled || settings.business.status !== "ACTIVE") {
    return <JoinUnavailable />;
  }

  const programName = settings.name?.trim() || "Cashback";
  const rate = Number(settings.ratePercent.toString());
  const successMembership = qs.card
    ? await prisma.businessCustomerMembership.findFirst({
        where: { cardToken: qs.card, businessId: settings.businessId, status: "ACTIVE", cashbackJoinedAt: { not: null } },
      })
    : null;
  const successCardUrl = successMembership ? await getCardUrl(successMembership.cardToken) : null;
  const branding = resolveBusinessBranding(settings.business.branding);

  return (
    <BusinessBrandingProvider branding={branding}>
      <main className="min-h-screen px-4 py-8" style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}>
        <section className="mx-auto w-full max-w-lg overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-2xl shadow-slate-200/60">
          <div className="business-bg px-6 py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-current opacity-80">Join cashback program</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{settings.business.name}</h1>
            <p className="mt-2 text-lg font-semibold text-current opacity-90">{programName}</p>
          </div>

          {successMembership && successCardUrl ? (
            <div className="p-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">You&apos;re in</p>
                <h2 className="mt-2 text-2xl font-bold text-emerald-950">Welcome, {successMembership.firstName}</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  You now earn {rate}% cashback on every payment. Show your card at checkout so staff can add it.
                </p>
              </div>
              <Link
                href={successCardUrl}
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl business-button px-5 text-sm font-bold"
              >
                Open My Card
              </Link>
              <p className="mt-3 break-all rounded-xl bg-[#F8FAFC] p-3 text-xs text-[#64748B]">{successCardUrl}</p>
            </div>
          ) : (
            <div className="p-6">
              {qs.error ? (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{qs.error}</p>
              ) : null}
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">{rate}% cashback on every payment</p>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Your cashback builds up as a balance you can spend on future visits.
                </p>
              </div>

              <form action={joinCashbackProgramAction} className="mt-5 grid gap-4">
                <input type="hidden" name="token" value={token} />
                <Input label="First name" name="firstName" autoComplete="given-name" required defaultValue={qs.firstName} />
                <Input label="Last name" name="lastName" autoComplete="family-name" defaultValue={qs.lastName} />
                <Input label="Phone number" name="phone" autoComplete="tel" required placeholder="0501234567" defaultValue={qs.phone} />
                <p className="text-xs leading-5 text-[#64748B]">
                  We use your phone number to find or create your customer profile for this business only.
                </p>
                <Input label="Email" name="email" type="email" autoComplete="email" defaultValue={qs.email} />
                <Input label="Birthday" name="birthday" type="date" autoComplete="bday" defaultValue={qs.birthday} />
                <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                  <input type="checkbox" name="marketingConsent" className="h-4 w-4 rounded border-[#E5E7EB]" />
                  I agree to receive offers and updates from this business
                </label>
                <button type="submit" className="min-h-12 rounded-xl business-button px-5 text-sm font-bold transition hover:brightness-95">
                  Join Cashback
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
  type = "text",
  required = false,
  autoComplete,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      <span>
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm font-normal outline-none transition business-ring focus:ring-0"
      />
    </label>
  );
}

function JoinUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">Cashback not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">This cashback link is unavailable or the program is switched off.</p>
      </section>
    </main>
  );
}
