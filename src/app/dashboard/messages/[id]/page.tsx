import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import { CopyButton } from "@/components/CopyButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { engagementEventLabels } from "@/lib/engagement";
import { formatDateTime } from "@/lib/format";
import { deliveryStatusLabels, getWhatsAppManualLink, messageChannelLabels } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { cancelMessageAction, markMessageSentManuallyAction } from "@/app/dashboard/messages/actions";

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const message = await prisma.messageDeliveryQueue.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      engagementEvent: true,
      businessCustomerMembership: { include: { globalCustomer: true } },
      preparedByUser: true,
      sentByUser: true,
    },
  });

  if (!message) notFound();

  const customer = message.businessCustomerMembership.globalCustomer;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const whatsAppLink = message.channel === "WHATSAPP" ? getWhatsAppManualLink(customer.phone, message.messageBody) : null;
  const canChange = ["DRAFT", "READY"].includes(message.status);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Message detail">
      {qs.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
      {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
      <div>
        <Link href="/dashboard/messages" className="text-sm font-semibold business-text">Back to message outbox</Link>
      </div>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <p className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
          Messages are prepared only and are not sent automatically.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Customer" value={customerName} />
          <Info label="Engagement Event" value={message.engagementEvent ? engagementEventLabels[message.engagementEvent.eventType] : "-"} />
          <Info label="Channel" value={messageChannelLabels[message.channel]} />
          <Info label="Status" value={deliveryStatusLabels[message.status]} />
          <Info label="Recipient" value={message.recipientMasked} />
          <Info label="Created Date" value={formatDateTime(message.createdAt)} />
          <Info label="Prepared By" value={message.preparedByUser?.name ?? "-"} />
          <Info label="Sent By" value={message.sentByUser?.name ?? "-"} />
          <Info label="Sent At" value={message.sentAt ? formatDateTime(message.sentAt) : "-"} />
          <Info label="Message Body" value={<p className="whitespace-pre-wrap leading-6">{message.messageBody}</p>} wide />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Manual delivery actions</h2>
        <div className="mt-5 flex flex-wrap items-start gap-3">
          <CopyButton value={message.messageBody} label="Copy Message" copiedLabel="Message copied." />
          {whatsAppLink ? (
            <>
              <CopyButton value={whatsAppLink} label="Copy WhatsApp Link" copiedLabel="WhatsApp link copied." />
              <a href={whatsAppLink} target="_blank" rel="noreferrer" className="rounded-md border business-border px-4 py-2 text-sm font-semibold business-text">
                Open WhatsApp Link
              </a>
            </>
          ) : null}
          {canChange ? (
            <>
              <MessageActionForm action={markMessageSentManuallyAction} uuid={message.uuid} label="Mark Sent Manually" primary />
              <MessageActionForm action={cancelMessageAction} uuid={message.uuid} label="Cancel" />
            </>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function MessageActionForm({
  action,
  uuid,
  label,
  primary = false,
}: {
  action: (formData: FormData) => Promise<void>;
  uuid: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <CsrfInput scope="dashboard:messages" />
      <input type="hidden" name="messageUuid" value={uuid} />
      <button
        type="submit"
        className={primary ? "rounded-md business-button px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]"}
      >
        {label}
      </button>
    </form>
  );
}

function Info({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#E5E7EB] p-4 ${wide ? "md:col-span-3" : ""}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
