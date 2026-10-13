"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { submitDemoRequestAction, type DemoRequestState } from "@/app/request-demo/actions";

const businessTypes = ["Coffee Shop", "Restaurant", "Salon / Barber", "Clinic / Aesthetic", "Gym", "Retail Store", "Car Care", "Perfume / Oud", "Service Business", "Other"];
const countries = ["United Arab Emirates", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain", "Oman", "Jordan", "Egypt", "Other"];

export function DemoRequestForm() {
  const [state, formAction, pending] = useActionState<DemoRequestState | null, FormData>(submitDemoRequestAction, null);

  if (state?.ok) {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold">Request received</h2>
        <p className="mt-3 text-sm leading-6">
          Thank you. We have your details and will be in touch within one working day to arrange your demo.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="relative grid gap-4 rounded-[30px] border border-orange-100 bg-white p-5 shadow-[0_24px_70px_rgba(242,106,33,0.14)] sm:p-7"
    >
      <FormField label="Business name" name="businessName" placeholder="Rawabi Coffee" required />
      <FormField label="Contact person name" name="contactName" placeholder="Ahmed Mahmoud" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" name="email" type="email" placeholder="owner@example.com" required />
        <FormField label="Phone" name="phone" type="tel" placeholder="050 123 4567" required />
      </div>
      <label className="grid gap-2 text-sm font-semibold text-[#111827]">
        Country<RequiredMark />
        <select name="country" required className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm outline-none transition focus:border-[#F26A21] focus:ring-4 focus:ring-orange-100">
          <option value="">Select country</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Business type<RequiredMark />
          <select name="businessType" required className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm outline-none transition focus:border-[#F26A21] focus:ring-4 focus:ring-orange-100">
            <option value="">Select type</option>
            {businessTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <FormField label="Number of branches" name="branches" type="number" min="1" placeholder="1" required />
      </div>
      <label className="grid gap-2 text-sm font-semibold text-[#111827]">
        Message
        <textarea
          name="message"
          rows={5}
          placeholder="Tell us about your loyalty program goals."
          className="resize-y rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none transition focus:border-[#F26A21] focus:ring-4 focus:ring-orange-100"
        />
      </label>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-2xl bg-[#F26A21] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#F26A21] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Sending..." : "Request Demo"}
      </button>
      <p className="text-xs leading-5 text-[#64748B]">
        We use your details only to prepare a relevant Loyalty Card UAE demo.
      </p>
    </form>
  );
}

function FormField({ label, name, type = "text", placeholder, required = false, min }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; min?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      {required ? <RequiredMark /> : null}
      <input
        name={name}
        type={type}
        min={min}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-2xl border border-[#E5E7EB] px-4 text-sm outline-none transition focus:border-[#F26A21] focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}
