import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { DashboardShell } from "@/components/DashboardShell";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  MetricCard,
  PageActions,
  PageIntro,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatAed } from "@/lib/cashback";
import { getCashbackJoinQrDataUrl, getCashbackJoinUrl } from "@/lib/cashback-enrollment";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const EDIT_HREF = "/dashboard/programs/new?type=cashback";

// "BUSINESS_DEFAULT" -> "Business Default"
function cardThemeLabel(theme: string): string {
  return theme
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Cashback is stored as one BusinessCashbackSettings row per business rather
// than a LoyaltyProgram with a uuid, so it has its own fixed detail route. It
// behaves like any other program: customers join it (staff enrol them or they
// use the join QR below) and only members earn or spend cashback.
export default async function CashbackProgramDetailPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const { user, business } = await getBusinessOwnerContext();
  const qs = await searchParams;
  const settings = business.cashbackSettings;
  const currency = settings?.currency ?? "AED";
  const name = settings?.name?.trim() || "Cashback";
  const enabled = Boolean(settings?.enabled);
  const rate = settings?.ratePercent != null ? settings.ratePercent.toString() : "5";

  const memberWhere = { businessId: business.id, cashbackJoinedAt: { not: null } };
  const [members, earnAgg, spendAgg, balanceAgg, recent, latestMembers] = await Promise.all([
    prisma.businessCustomerMembership.count({ where: memberWhere }),
    prisma.cashbackTransaction.aggregate({ where: { businessId: business.id, type: "EARN" }, _sum: { amount: true, billAmount: true } }),
    prisma.cashbackTransaction.aggregate({ where: { businessId: business.id, type: "SPEND" }, _sum: { amount: true } }),
    prisma.businessCustomerMembership.aggregate({ where: { businessId: business.id }, _sum: { cashbackBalance: true } }),
    prisma.cashbackTransaction.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { businessCustomerMembership: { select: { firstName: true, lastName: true } } },
    }),
    prisma.businessCustomerMembership.findMany({
      where: memberWhere,
      orderBy: { cashbackJoinedAt: "desc" },
      take: 10,
      select: { uuid: true, firstName: true, lastName: true, cashbackJoinedAt: true, cashbackBalance: true },
    }),
  ]);
  const joinUrl = settings ? await getCashbackJoinUrl(settings.joinToken) : null;
  const joinQrCode = settings ? await getCashbackJoinQrDataUrl(settings.joinToken) : null;
  const spendBase = Number(earnAgg._sum.billAmount ?? 0);
  const given = Number(earnAgg._sum.amount ?? 0);
  const redeemed = Number(spendAgg._sum.amount ?? 0);
  const outstanding = Number(balanceAgg._sum.cashbackBalance ?? 0);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title={name} hideWelcomeMessage>
      <div className="grid gap-5">
        {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
        <PageIntro
          eyebrow="Cashback program"
          description="Customers who join this program earn a percentage of what they pay as a balance for future visits."
          actions={
            <PageActions>
              <ButtonLink href="/dashboard/programs" variant="outline">Back to Programs</ButtonLink>
              <ButtonLink href={EDIT_HREF} variant="business">Edit cashback card</ButtonLink>
            </PageActions>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Cashback metrics">
          <MetricCard label="Members in cashback" value={members.toLocaleString()} />
          <MetricCard label="Spend earning cashback" value={formatAed(spendBase, currency)} tone="business" />
          <MetricCard label="Cashback given" value={formatAed(given, currency)} tone="success" />
          <MetricCard label="Redeemed" value={formatAed(redeemed, currency)} />
          <MetricCard label="Outstanding balance" value={formatAed(outstanding, currency)} tone="warning" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            <SectionCard title="Program Information" description="How cashback is earned and who can earn it.">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Cashback rate" value={rate + "% of each payment"} />
                <Info label="Who earns" value={`Members only (${members.toLocaleString()})`} />
                <Info label="Status" value={enabled ? "Active" : "Off"} />
                <Info label="Currency" value={currency} />
                <Info label="Max bill per transaction" value={settings?.maxBillAmount != null ? formatAed(Number(settings.maxBillAmount), currency) : "No limit"} />
                <Info label="Max redemption per transaction" value={settings?.maxRedemption != null ? formatAed(Number(settings.maxRedemption), currency) : "No limit"} />
                <Info label="Card style" value={cardThemeLabel(settings?.cardTheme ?? "BUSINESS_DEFAULT")} />
                <Info label="Created" value={settings?.createdAt ? formatDate(settings.createdAt) : "-"} />
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5">
            {joinUrl && joinQrCode ? (
              <SectionCard title="Program Join QR" description="Print or share this QR so customers can join cashback themselves. Staff can also enrol a customer from their profile or the scanner.">
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center">
                    <img src={joinQrCode} alt={`${name} join QR code`} className="mx-auto h-52 w-52 rounded-xl bg-white p-2" />
                    <p className="mt-3 text-sm font-semibold text-[#0F172A]">Scan to join {name}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{business.name}</p>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Join link</p>
                    <p className="mt-2 break-all text-sm font-semibold text-[#0F172A]">{joinUrl}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <CopyButton value={joinUrl} label="Copy join link" copiedLabel="Join link copied." />
                    <ButtonLink href={joinUrl} variant="outline" target="_blank" rel="noopener noreferrer">
                      Open Join Page
                    </ButtonLink>
                    <ButtonLink href="/dashboard/programs/cashback/join-poster" variant="business">
                      Printable Poster
                    </ButtonLink>
                  </div>
                  {!enabled ? <p className="text-xs text-[#B45309]">Cashback is off, so this link shows &quot;not available&quot; until you switch it on.</p> : null}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Card design" description="Customize the cashback card customers see in their wallet.">
              <div className="grid gap-3">
                <p className="text-sm text-[#64748B]">Edit the cashback rate, per-transaction caps, card theme and picture in the cashback setup.</p>
                <ButtonLink href={EDIT_HREF} variant="business">Edit cashback card</ButtonLink>
              </div>
            </SectionCard>

            <SectionCard title="Balance summary" description="Cashback issued, spent and still owed to customers.">
              <div className="grid gap-3">
                <Info label="Cashback given (all time)" value={formatAed(given, currency)} />
                <Info label="Redeemed (all time)" value={formatAed(redeemed, currency)} />
                <Info label="Outstanding balance" value={formatAed(outstanding, currency)} />
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="Latest members" description="Customers who most recently joined the cashback program.">
          {latestMembers.length > 0 ? (
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHeadCell>Customer</DataTableHeadCell>
                  <DataTableHeadCell>Joined</DataTableHeadCell>
                  <DataTableHeadCell>Balance</DataTableHeadCell>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {latestMembers.map((member) => (
                  <tr key={member.uuid}>
                    <DataTableCell className="font-semibold text-[#0F172A]">
                      <Link href={`/dashboard/customers/${member.uuid}?tab=cashback`} className="underline-offset-4 hover:underline">
                        {member.firstName} {member.lastName ?? ""}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{member.cashbackJoinedAt ? formatDate(member.cashbackJoinedAt) : "-"}</DataTableCell>
                    <DataTableCell>{formatAed(Number(member.cashbackBalance), currency)}</DataTableCell>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState title="No members yet" description="Enrol customers from their profile or the scanner, or share the join QR." />
          )}
        </SectionCard>

        <SectionCard title="Recent cashback activity" description="The latest cashback earned and redeemed across your customers.">
          {recent.length > 0 ? (
            <DataTable>
              <DataTableHeader>
                <tr>
                  <DataTableHeadCell>Customer</DataTableHeadCell>
                  <DataTableHeadCell>Type</DataTableHeadCell>
                  <DataTableHeadCell>Bill</DataTableHeadCell>
                  <DataTableHeadCell>Cashback</DataTableHeadCell>
                  <DataTableHeadCell>Balance after</DataTableHeadCell>
                  <DataTableHeadCell>Date</DataTableHeadCell>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {recent.map((tx) => {
                  const earn = tx.type === "EARN";
                  return (
                    <tr key={tx.id}>
                      <DataTableCell className="font-semibold text-[#0F172A]">{tx.businessCustomerMembership.firstName} {tx.businessCustomerMembership.lastName ?? ""}</DataTableCell>
                      <DataTableCell><StatusBadge tone={earn ? "success" : "neutral"}>{earn ? "Earned" : "Redeemed"}</StatusBadge></DataTableCell>
                      <DataTableCell>{tx.billAmount != null ? formatAed(Number(tx.billAmount), tx.currency) : "-"}</DataTableCell>
                      <DataTableCell className={earn ? "font-semibold text-emerald-700" : "font-semibold text-[#B91C1C]"}>{earn ? "+" : "-"}{formatAed(Number(tx.amount), tx.currency)}</DataTableCell>
                      <DataTableCell>{formatAed(Number(tx.balanceAfter), tx.currency)}</DataTableCell>
                      <DataTableCell>{formatDate(tx.createdAt)}</DataTableCell>
                    </tr>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState title="No cashback activity yet" description="Cashback earned and redeemed at the counter will appear here." />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}
