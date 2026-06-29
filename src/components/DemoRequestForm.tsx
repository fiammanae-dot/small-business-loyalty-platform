"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const businessTypes = ["Coffee Shop", "Restaurant", "Salon / Barber", "Gym", "Retail Store", "Car Care", "Service Business", "Other"];
const countries = ["United Arab Emirates", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain", "Oman", "Jordan", "Egypt", "Other"];

export function DemoRequestForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold">Request received</h2>
        <p className="mt-3 text-sm leading-6">
          Thank you. Our team will review your details and follow up with the next step.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className="grid gap-4 rounded-[30px] border border-orange-100 bg-white p-5 shadow-[0_24px_70px_rgba(249,115,22,0.14)] sm:p-7"
    >
      <FormField label="Business name" name="businessName" placeholder="Rawabi Coffee" required />
      <FormField label="Contact person name" name="contactName" placeholder="Ahmed Mahmoud" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" name="email" type="email" placeholder="owner@example.com" required />
        <FormField label="Phone" name="phone" type="tel" placeholder="050 123 4567" required />
      </div>
      <label className="grid gap-2 text-sm font-semibold text-[#111827]">
        Country
        <select name="country" required className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100">
          <option value="">Select country</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Business type
          <select name="businessType" required className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100">
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
          className="resize-y rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        />
      </label>
      <button type="submit" className="min-h-12 rounded-2xl bg-[#FF5A0A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
        Request a walkthrough
      </button>
      <p className="text-xs leading-5 text-[#64748B]">
        We use your details only to prepare a relevant LoyaltyBase walkthrough.
      </p>
    </form>
  );
}

function FormField({ label, name, type = "text", placeholder, required = false, min }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; min?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      <input
        name={name}
        type={type}
        min={min}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-2xl border border-[#E5E7EB] px-4 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}
