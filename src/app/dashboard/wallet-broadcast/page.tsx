import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { WalletBroadcastFields } from "@/components/WalletBroadcastFields";
import { SectionCard } from "@/components/ui/SectionCard";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { isGoogleWalletConfigured } from "@/lib/google-wallet/config";
import { prisma } from "@/lib/prisma";
import {
  getWalletBroadcastCooldown,
  WALLET_BROADCAST_BODY_MAX,
  WALLET_BROADCAST_COOLDOWN_STATUSES,
  WALLET_BROADCAST_HEADER_MAX,
} from "@/lib/wallet-broadcast/policy";
import { sendWalletBroadcastAction } from "./actions";

const statusLabels: Record<string, { label: string; className: string }> = {
  SENT: { label: "Sent", className: "bg-emerald-50 text-emerald-700" },
  PARTIAL: { label: "Partly sent", className: "bg-amber-50 text-amber-800" },
  SKIPPED: { label: "Not sent", className: "bg-slate-100 text-slate-600" },
  FAILED: { label: "Failed", className: "bg-red-50 text-red-700" },
};

function googleWalletConfigured() {
  try {
    return isGoogleWalletConfigured();
  } catch {
    return false;
  }
}

export default async function WalletBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, supportSession } = await getBusinessOwnerContext();
  const qs = await searchParams;
  const businessId = user.businessId;

  const configured = googleWalletConfigured();
  const [walletClassCount, lastCounted, history] = await Promise.all([
    prisma.googleWalletClass.count({ where: { businessId, loyaltyProgram: { active: true } } }),
    prisma.walletBroadcast.findFirst({
      where: { businessId, status: { in: [...WALLET_BROADCAST_COOLDOWN_STATUSES] } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
    prisma.walletBroadcast.findMany({
      where: { businessId },
      orderBy: { sentAt: "desc" },
      take: 5,
      include: { sentByUser: { select: { name: true } } },
    }),
  ]);
  const cooldown = getWalletBroadcastCooldown(lastCounted?.sentAt ?? null, new Date());

  let blockedReason: string | null = null;
  if (supportSession) {
    blockedReason = "Sending is turned off during a support session.";
  } else if (!configured) {
    blockedReason = "Google Wallet isn't switched on for your account yet, so there is no one to send to.";
  } else if (walletClassCount === 0) {
    blockedReason =
      "None of your customers has added your card to Google Wallet yet. Once someone taps \"Add to Google Wallet\" on their card, you can message them here.";
  } else if (cooldown.active) {
    blockedReason = `You can send one message every 12 hours. Next message available ${formatDateTime(cooldown.availableAt)}.`;
  }

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Send a message to your Wallet customers">
      {qs.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
      {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}

      <SectionCard
        title="New Wallet message"
        description="Free. It appears as a notification on the phones of customers who added your loyalty card to Google Wallet. Customers without the card in Google Wallet won't get it - use WhatsApp for them."
      >
        <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] leading-5 text-[#4B5263]">
          <li>No cost per message.</li>
          <li>Reaches only customers who already saved your card in Google Wallet (Apple Wallet coming later).</li>
          <li>One message every 12 hours, so customers don't get too many.</li>
        </ul>
        {blockedReason ? (
          <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{blockedReason}</p>
        ) : null}
        <form action={sendWalletBroadcastAction}>
          <CsrfInput scope="dashboard:wallet-broadcast" />
          <WalletBroadcastFields headerMax={WALLET_BROADCAST_HEADER_MAX} bodyMax={WALLET_BROADCAST_BODY_MAX} disabled={Boolean(blockedReason)} />
        </form>
      </SectionCard>

      <SectionCard title="Recent messages" description="Your last 5 Wallet messages.">
        {history.length === 0 ? (
          <p className="text-sm text-[#7A8091]">No messages sent yet.</p>
        ) : (
          <ul className="divide-y divide-[#E7E9EE]">
            {history.map((item) => {
              const status = statusLabels[item.status] ?? statusLabels.SKIPPED;
              return (
                <li key={item.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#171A21]">{item.header}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#4B5263]">{item.body}</p>
                  <p className="mt-1 text-xs text-[#7A8091]">
                    {formatDateTime(item.sentAt)}
                    {item.sentByUser?.name ? ` · ${item.sentByUser.name}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </DashboardShell>
  );
}
