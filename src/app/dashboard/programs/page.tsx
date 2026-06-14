import Link from "next/link";
import type { ReactNode } from "react";
import { Gift, Search, Trophy, Users } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { progressValue } from "@/lib/programs";
import { businessTypeLabels } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type ProgramSearchParams = {
  q?: string;
  status?: string;
  sort?: string;
  direction?: string;
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<ProgramSearchParams>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "";
  const sort = params.sort ?? "created";
  const direction = params.direction === "asc" ? "asc" : "desc";
  const allPrograms = await prisma.loyaltyProgram.findMany({
    where: { businessId: user.businessId },
    include: {
      memberships: { select: { earnedStamps: true, bonusStamps: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const programs = allPrograms
    .filter((program) => {
      const matchesSearch =
        !query ||
        program.name.toLowerCase().includes(query) ||
        program.productOrServiceName.toLowerCase().includes(query) ||
        program.rewardName.toLowerCase().includes(query);
      const matchesStatus = !status || (status === "active" ? program.active : !program.active);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const sortValue =
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "members"
            ? a._count.memberships - b._count.memberships
            : sort === "status"
              ? Number(a.active) - Number(b.active)
              : a.createdAt.getTime() - b.createdAt.getTime();
      return direction === "asc" ? sortValue : -sortValue;
    });

  const activeCount = allPrograms.filter((program) => program.active).length;
  const inactiveCount = allPrograms.length - activeCount;
  const rewardReadyCount = allPrograms.reduce(
    (total, program) =>
      total +
      program.memberships.filter((membership) => membership.earnedStamps + membership.bonusStamps >= program.requiredStamps).length,
    0,
  );

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Loyalty programs">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Programs</h2>
            <p className="text-sm text-[#6B7280]">Manage loyalty program setup and enrolled customers.</p>
          </div>
          <Link href="/dashboard/programs/new" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
            Create Program
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <KpiCard icon={<Gift className="h-5 w-5" />} label="Active Programs" value={activeCount} />
          <KpiCard icon={<Trophy className="h-5 w-5" />} label="Reward Ready" value={rewardReadyCount} />
          <KpiCard icon={<Users className="h-5 w-5" />} label="Inactive Programs" value={inactiveCount} />
        </div>
        <form className="mt-5 grid gap-3 rounded-md border border-[#E5E7EB] bg-zinc-50 p-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto] lg:items-center">
          <label className="relative">
            <span className="sr-only">Search programs</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search programs or rewards"
              className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select name="sort" defaultValue={sort} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="created">Created date</option>
            <option value="name">Program name</option>
            <option value="members">Members</option>
            <option value="status">Status</option>
          </select>
          <select name="direction" defaultValue={direction} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
            Apply
          </button>
          <Link href="/dashboard/programs" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827]">
            Clear Filters
          </Link>
        </form>
        <p className="mt-4 text-sm font-semibold text-[#6B7280]">Showing {programs.length} programs</p>
        <div className="mt-6 grid gap-3 lg:hidden">
          {programs.map((program) => (
            <article key={program.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#111827]">{program.name}</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">{businessTypeLabels[program.businessType]}</p>
                </div>
                <StatusBadge active={program.active} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#6B7280]">
                <p>Progress setup: {progressValue(0, program.startingBonusStamps)} / {program.requiredStamps}</p>
                <p>Reward: {program.rewardName}</p>
                <p>Customers: {program._count.memberships}</p>
                <p>Created: {formatDate(program.createdAt)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/dashboard/programs/${program.uuid}`} className="font-semibold text-[#F97316]">View</Link>
                <Link href={`/dashboard/programs/${program.uuid}/edit`} className="font-semibold text-[#F97316]">Edit</Link>
                <Link href={`/dashboard/programs/${program.uuid}/customers`} className="font-semibold text-[#F97316]">Customers</Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 hidden lg:block">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Name", "Business type", "Progress setup", "Reward", "Status", "Customers", "Created", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{program.name}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{businessTypeLabels[program.businessType]}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{progressValue(0, program.startingBonusStamps)} / {program.requiredStamps}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{program.rewardName}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge active={program.active} /></td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{program._count.memberships}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(program.createdAt)}</td>
                  <td className="border-b border-[#E5E7EB] px-3 py-4">
                    <div className="flex gap-3">
                      <Link href={`/dashboard/programs/${program.uuid}`} className="font-semibold text-[#F97316]">View</Link>
                      <Link href={`/dashboard/programs/${program.uuid}/edit`} className="font-semibold text-[#F97316]">Edit</Link>
                      <Link href={`/dashboard/programs/${program.uuid}/customers`} className="font-semibold text-[#F97316]">Customers</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {programs.length === 0 ? (
            <div className="py-10 text-center">
              <EmptyPrograms filtered={Boolean(query || status)} />
            </div>
          ) : null}
        </div>
        {programs.length === 0 ? (
          <div className="py-10 text-center lg:hidden">
            <EmptyPrograms filtered={Boolean(query || status)} />
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}

function KpiCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
          <p className="text-2xl font-semibold text-[#111827]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmptyPrograms({ filtered }: { filtered: boolean }) {
  return (
    <>
      <p className="text-sm font-semibold text-[#111827]">{filtered ? "No programs match these filters." : "Create your first loyalty program."}</p>
      <p className="mt-2 text-sm text-[#6B7280]">
        {filtered ? "Clear the filters to see all loyalty programs." : "Set up a simple stamp program so customers can start earning progress."}
      </p>
      <Link href={filtered ? "/dashboard/programs" : "/dashboard/programs/new"} className="mt-4 inline-flex rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
        {filtered ? "Clear Filters" : "Create Program"}
      </Link>
    </>
  );
}
