import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { customerSourceLabels } from "@/lib/customers";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    consent?: string;
    source?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const query = params.q?.trim();
  const status = ["ACTIVE", "INACTIVE", "BLOCKED"].includes(params.status ?? "") ? params.status : undefined;
  const source = ["STAFF", "OWNER", "IMPORT", "SELF_SIGNUP"].includes(params.source ?? "") ? params.source : undefined;
  const consent = ["yes", "no"].includes(params.consent ?? "") ? params.consent : undefined;

  const customers = await prisma.businessCustomerMembership.findMany({
    where: {
      businessId: user.businessId,
      ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "BLOCKED" } : {}),
      ...(source ? { source: source as "STAFF" | "OWNER" | "IMPORT" | "SELF_SIGNUP" } : {}),
      ...(consent ? { marketingConsent: consent === "yes" } : {}),
      ...(query
        ? {
            OR: [
              { globalCustomer: { firstName: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { lastName: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { phone: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { normalizedPhone: { contains: query, mode: "insensitive" } } },
              { globalCustomer: { email: { contains: query, mode: "insensitive" } } },
              { cardToken: { contains: query, mode: "insensitive" } },
              { programMemberships: { some: { loyaltyProgram: { name: { contains: query, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    include: { globalCustomer: true, createdBranch: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Customers">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Business customer memberships</h2>
            <p className="text-sm text-[#6B7280]">Only customers enrolled in your business are shown.</p>
          </div>
          <Link href="/dashboard/customers/new" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
            Enroll customer
          </Link>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-5">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search name, phone, card number, program"
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100 md:col-span-2"
          />
          <Select name="status" label="Status" value={params.status} options={[["", "All statuses"], ["ACTIVE", "Active"], ["INACTIVE", "Inactive"], ["BLOCKED", "Blocked"]]} />
          <Select name="consent" label="Marketing consent" value={params.consent} options={[["", "All consent"], ["yes", "Consented"], ["no", "No consent"]]} />
          <Select name="source" label="Source" value={params.source} options={[["", "All sources"], ["OWNER", "Owner"], ["STAFF", "Staff"], ["IMPORT", "Import"], ["SELF_SIGNUP", "Self signup"]]} />
          <button type="submit" className="h-10 rounded-md border border-[#F97316] px-4 text-sm font-semibold text-[#F97316] md:col-start-5">
            Apply filters
          </button>
          <Link href="/dashboard/customers" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] md:col-start-4">
            Clear search
          </Link>
        </form>
        {query ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#6B7280]">Recent search:</span>
            <Link href={`/dashboard/customers?q=${encodeURIComponent(query)}`} className="rounded-md bg-orange-50 px-3 py-1 font-semibold text-[#F97316]">
              {query}
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 lg:hidden">
          {customers.map((membership) => (
            <article key={membership.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#111827]">{membership.globalCustomer.firstName} {membership.globalCustomer.lastName ?? ""}</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">{membership.globalCustomer.phone}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{membership.globalCustomer.email ?? "No email"}</p>
                </div>
                <StatusBadge status={membership.status} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
                <p>Marketing consent: {membership.marketingConsent ? "Yes" : "No"}</p>
                <p>Joined: {formatDate(membership.joinedAt)}</p>
                <p>Card issued branch: {membership.createdBranch?.name ?? "-"}</p>
                <p>Source: {customerSourceLabels[membership.source]}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href={`/dashboard/customers/${membership.uuid}`} className="font-semibold text-[#F97316]">View</Link>
                <Link href={`/dashboard/customers/${membership.uuid}/edit`} className="font-semibold text-[#F97316]">Edit</Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 hidden lg:block">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Customer name", "Phone", "Email", "Marketing consent", "Status", "Joined date", "Card issued branch", "Source", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((membership) => (
                <tr key={membership.id} className="align-top">
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">
                    {membership.globalCustomer.firstName} {membership.globalCustomer.lastName ?? ""}
                  </td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.globalCustomer.phone}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.globalCustomer.email ?? "-"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.marketingConsent ? "Yes" : "No"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge status={membership.status} /></td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(membership.joinedAt)}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{membership.createdBranch?.name ?? "-"}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{customerSourceLabels[membership.source]}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4">
                    <div className="flex gap-3">
                      <Link href={`/dashboard/customers/${membership.uuid}`} className="font-semibold text-[#F97316]">View</Link>
                      <Link href={`/dashboard/customers/${membership.uuid}/edit`} className="font-semibold text-[#F97316]">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-[#111827]">Create your first customer.</p>
              <p className="mt-2 text-sm text-[#6B7280]">Enroll a customer to start issuing cards, stamps, and engagement events.</p>
              <Link href="/dashboard/customers/new" className="mt-4 inline-flex rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
                Enroll customer
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function Select({ name, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}
