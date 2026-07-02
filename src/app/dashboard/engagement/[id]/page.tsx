import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import { CopyButton } from "@/components/CopyButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { engagementEventLabels, getMessageTemplate, renderEngagementMessage } from "@/lib/engagement";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { prepareMessageAction } from "@/app/dashboard/messages/actions";

export default async function EngagementEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const event = await prisma.engagementEvent.findFirst({
    where: { uuid: id, businessId: user.businessId },
    include: {
      customer: {
        include: {
          createdBranch: true,
        },
      },
    },
  });

  if (!event) notFound();

  const customerName = `${event.customer.firstName} ${event.customer.lastName ?? ""}`.trim();
  const template = await getMessageTemplate(user.businessId, event.eventType);
  const message = renderEngagementMessage(template.message, event.metadata, customerName, business.name);
  const whatsappMessage = `${message}\n\n${business.name}`;
  const smsMessage = message;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Engagement event">
      {qs.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
      {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}
      <div>
        <Link href="/dashboard/engagement" className="text-sm font-semibold business-primary">Back to engagement center</Link>
      </div>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Event type" value={engagementEventLabels[event.eventType]} />
          <Info label="Status" value={event.status.toLowerCase()} />
          <Info label="Event date" value={formatDateTime(event.eventDate)} />
          <Info label="Customer" value={customerName} />
          <Info label="Branch" value={event.customer.createdBranch?.name ?? "-"} />
          <Info label="Marketing consent" value={event.customer.marketingConsent ? "Yes" : "No"} />
          <Info label="Template title" value={template.title} />
          <Info label="Created at" value={formatDateTime(event.createdAt)} />
          <Info label="Metadata" value={<pre className="whitespace-pre-wrap text-xs">{JSON.stringify(event.metadata, null, 2)}</pre>} wide />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Manual share message</h2>
        <p className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
          Messages are prepared only and are not sent automatically.
        </p>
        <p className="mt-2 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-sm leading-6 text-[#111827]">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <CopyButton value={message} label="Copy Message" copiedLabel="Message copied." />
          <CopyButton value={whatsappMessage} label="Copy WhatsApp Message" copiedLabel="WhatsApp message copied." />
          <CopyButton value={smsMessage} label="Copy SMS Message" copiedLabel="SMS message copied." />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Prepare delivery</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Create a ready message in the outbox for manual delivery. No provider API is called.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <PrepareButton eventUuid={event.uuid} channel="WHATSAPP" label="Prepare WhatsApp Message" />
          <PrepareButton eventUuid={event.uuid} channel="SMS" label="Prepare SMS Message" />
          <PrepareButton eventUuid={event.uuid} channel="EMAIL" label="Prepare Email Message" />
        </div>
      </section>
    </DashboardShell>
  );
}

function PrepareButton({ eventUuid, channel, label }: { eventUuid: string; channel: "WHATSAPP" | "SMS" | "EMAIL"; label: string }) {
  return (
    <form action={prepareMessageAction}>
      <CsrfInput scope="dashboard:messages" />
      <input type="hidden" name="eventUuid" value={eventUuid} />
      <input type="hidden" name="channel" value={channel} />
      <button type="submit" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
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
