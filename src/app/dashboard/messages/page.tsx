import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, MessageSquare, Search, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { engagementEventLabels } from "@/lib/engagement";
import { formatDateTime } from "@/lib/format";
import { deliveryStatusLabels, messageChannelLabels } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

type MessageSearchParams = {
  q?: string;
  status?: string;
  channel?: string;
  event?: string;
};

export default async function MessageOutboxPage({
  searchParams,
}: {
  searchParams: Promise<MessageSearchParams>;
}) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const allMessages = await prisma.messageDeliveryQueue.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "desc" },
    include: {
      engagementEvent: true,
      businessCustomerMembership: { include: { globalCustomer: true } },
    },
  });
  const messages = allMessages.filter((message) => {
    const customer = message.businessCustomerMembership.globalCustomer;
    const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim().toLowerCase();
    const matchesSearch =
      !query ||
      customerName.includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      (customer.email?.toLowerCase().includes(query) ?? false);
    const matchesStatus = !params.status || message.status === params.status;
    const matchesChannel = !params.channel || message.channel === params.channel;
    const matchesEvent = !params.event || message.engagementEvent?.eventType === params.event;
    return matchesSearch && matchesStatus && matchesChannel && matchesEvent;
  });
  const readyCount = allMessages.filter((message) => message.status === "READY").length;
  const sentCount = allMessages.filter((message) => message.status === "SENT_MANUALLY").length;
  const cancelledCount = allMessages.filter((message) => message.status === "CANCELLED").length;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Message outbox">
      <SectionCard>
        <p className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
          Messages are prepared only and are not sent automatically.
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold business-text">Prepared messages</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Manual delivery queue</h2>
          </div>
          <MessageSquare className="h-5 w-5 business-text" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MessageKpi icon={<MessageSquare className="h-5 w-5" />} label="Ready Messages" value={readyCount} />
          <MessageKpi icon={<CheckCircle2 className="h-5 w-5" />} label="Sent Manually" value={sentCount} />
          <MessageKpi icon={<XCircle className="h-5 w-5" />} label="Cancelled Messages" value={cancelledCount} />
        </div>

        <form className="mt-5 grid gap-3 rounded-md border border-[#E5E7EB] bg-zinc-50 p-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto] lg:items-center">
          <label className="relative">
            <span className="sr-only">Search messages</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" aria-hidden="true" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search customer, phone, or email"
              className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none business-ring focus:ring-0"
            />
          </label>
          <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All statuses</option>
            {Object.entries(deliveryStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="channel" defaultValue={params.channel ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All channels</option>
            {Object.entries(messageChannelLabels)
              .filter(([value]) => value !== "NONE")
              .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="event" defaultValue={params.event ?? ""} className="h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm">
            <option value="">All events</option>
            {Object.entries(engagementEventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-md business-button px-4 text-sm font-semibold text-white">Apply</button>
          <Link href="/dashboard/messages" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827]">
            Clear Filters
          </Link>
        </form>
        <p className="mt-4 text-sm font-semibold text-[#6B7280]">Showing {messages.length} messages</p>

        <div className="mt-5 grid gap-3 lg:hidden">
          {messages.map((message) => {
            const customer = message.businessCustomerMembership.globalCustomer;
            const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
            return (
              <article key={message.id} className="rounded-md border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#111827]">{customerName}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">{message.engagementEvent ? engagementEventLabels[message.engagementEvent.eventType] : "-"}</p>
                  </div>
                  <StatusBadge label={deliveryStatusLabels[message.status]} />
                </div>
                <p className="mt-3 text-sm text-[#6B7280]">{messageChannelLabels[message.channel]} - {formatDateTime(message.createdAt)}</p>
                <p className="mt-3 text-sm leading-6 text-[#6B7280]">{message.messageBody.slice(0, 140)}{message.messageBody.length > 140 ? "..." : ""}</p>
                <Link href={`/dashboard/messages/${message.uuid}`} className="mt-4 inline-flex font-semibold business-text">View</Link>
              </article>
            );
          })}
          {messages.length === 0 ? <EmptyMessages filtered={Boolean(query || params.status || params.channel || params.event)} /> : null}
        </div>

        <div className="mt-5 hidden lg:block">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Customer", "Event Type", "Channel", "Status", "Message Preview", "Created Date", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => {
                const customer = message.businessCustomerMembership.globalCustomer;
                const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
                return (
                  <tr key={message.id}>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold text-[#111827]">{customerName}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">
                      {message.engagementEvent ? engagementEventLabels[message.engagementEvent.eventType] : "-"}
                    </td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{messageChannelLabels[message.channel]}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge label={deliveryStatusLabels[message.status]} /></td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{message.messageBody.slice(0, 90)}{message.messageBody.length > 90 ? "..." : ""}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDateTime(message.createdAt)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4">
                      <Link href={`/dashboard/messages/${message.uuid}`} className="font-semibold business-text">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {messages.length === 0 ? <EmptyMessages filtered={Boolean(query || params.status || params.channel || params.event)} /> : null}
        </div>
      </SectionCard>
    </DashboardShell>
  );
}

function MessageKpi({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <MetricCard label={label} value={value} icon={icon} tone="business" className="h-full" />;
}
function StatusBadge({ label }: { label: string }) {
  return <span className="inline-flex rounded-md business-bg-soft px-2 py-1 text-xs font-semibold business-text">{label}</span>;
}

function EmptyMessages({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      title={filtered ? "No messages match these filters." : "No prepared messages yet."}
      description={filtered ? "Clear filters to return to the full message queue." : "Prepare a message from an engagement opportunity when you are ready to contact a customer manually."}
      action={(
        <Link href={filtered ? "/dashboard/messages" : "/dashboard/engagement"} className="inline-flex rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
          {filtered ? "Clear Filters" : "View Engagement"}
        </Link>
      )}
      className="my-4"
    />
  );
}



