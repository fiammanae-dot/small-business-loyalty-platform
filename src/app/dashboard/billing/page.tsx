import { DashboardShell } from "@/components/DashboardShell";
import { InvoiceBadge } from "@/components/InvoiceBadge";
import { formatMoney, getInvoiceDisplayStatus } from "@/lib/billing";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function BusinessBillingPage() {
  const { user } = await getBusinessOwnerContext();
  const invoices = await prisma.invoice.findMany({
    where: { businessId: user.businessId },
    include: {
      payments: { select: { amount: true } },
      subscription: { include: { subscriptionPlan: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Billing">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Invoices</h2>
          <p className="text-sm text-[#6B7280]">View invoices and offline payments recorded by the platform team.</p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Invoice number", "Plan", "Date", "Due date", "Amount", "Paid amount", "Status"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
                return (
                  <tr key={invoice.id}>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{invoice.invoiceNumber}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{invoice.subscription.subscriptionPlan.name}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(invoice.invoiceDate)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(invoice.dueDate)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(invoice.amount, invoice.currency)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatMoney(paid, invoice.currency)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4"><InvoiceBadge status={getInvoiceDisplayStatus(invoice)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invoices.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No invoices yet.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}
