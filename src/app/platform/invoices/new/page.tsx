import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { toDateInputValue } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createInvoiceAction } from "@/app/platform/invoices/actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const today = new Date();
  const due = new Date(today);
  due.setDate(today.getDate() + 14);

  const [businesses, subscriptions] = await Promise.all([
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.businessSubscription.findMany({
      orderBy: { createdAt: "desc" },
      include: { business: { select: { name: true } }, subscriptionPlan: { select: { name: true, priceMonthly: true } } },
    }),
  ]);

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Create invoice">
      <div>
        <Link href="/platform/invoices" className="text-sm font-semibold text-[#F97316]">Back to invoices</Link>
      </div>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {params.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
        <form action={createInvoiceAction} className="grid gap-5">
          <CsrfInput scope="platform:invoices" />
          <div className="grid gap-4 md:grid-cols-2">
            <SearchableCombobox
              label="Business"
              name="businessId"
              placeholder="Select business"
              emptyLabel="No businesses found."
              required
              options={businesses.map((business) => ({ value: business.id.toString(), label: business.name, description: "Business" }))}
            />
            <SearchableCombobox
              label="Subscription"
              name="subscriptionId"
              placeholder="Select subscription"
              emptyLabel="No subscriptions found."
              required
              options={subscriptions.map((subscription) => ({
                value: subscription.id.toString(),
                label: subscription.business.name,
                description: subscription.subscriptionPlan.name,
                badge: subscription.status,
              }))}
            />
            <Input name="invoiceDate" label="Invoice date" type="date" defaultValue={toDateInputValue(today)} />
            <Input name="dueDate" label="Due date" type="date" defaultValue={toDateInputValue(due)} />
            <Input name="amount" label="Amount" type="number" step="0.01" min="0.01" />
            <Input name="currency" label="Currency" defaultValue="AED" />
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Notes</span>
            <textarea name="notes" rows={4} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
          </label>
          <button type="submit" className="h-11 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white md:w-fit">
            Create draft invoice
          </button>
        </form>
      </section>
    </DashboardShell>
  );
}

function Input({
  name,
  label,
  type = "text",
  defaultValue,
  step,
  min,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} step={step} min={min} required className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}
