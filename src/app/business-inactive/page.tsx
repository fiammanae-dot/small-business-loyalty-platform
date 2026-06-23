import Link from "next/link";

import { INACTIVE_BUSINESS_ACCESS_MESSAGE } from "@/lib/session";

export default function BusinessInactivePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-[#111827]">
      <section className="mx-auto flex max-w-xl flex-col items-start rounded-md border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Access unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Business account inactive</h1>
        <p className="mt-4 text-base leading-7 text-[#4B5563]">{INACTIVE_BUSINESS_ACCESS_MESSAGE}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/logout" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#111827] px-5 text-sm font-semibold text-white">
            Sign out
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-5 text-sm font-semibold text-[#111827]">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
