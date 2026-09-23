"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusinessScopedUserOrRedirect } from "@/lib/authz";
import { validateCsrfForm } from "@/lib/csrf";
import { sendGoogleWalletBroadcastForBusiness } from "@/lib/google-wallet/service";
import { blockDemoModeExternalAction } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { runWalletBroadcast, WALLET_BROADCAST_COOLDOWN_STATUSES } from "@/lib/wallet-broadcast/policy";

const PATH = "/dashboard/wallet-broadcast";

function go(kind: "error" | "success", message: string): never {
  redirect(`${PATH}?${kind}=${encodeURIComponent(message)}`);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * "Send to Wallet customers": BUSINESS_OWNER only, business-wide. Pushes the
 * message to every customer who has the business's card in Google Wallet.
 */
export async function sendWalletBroadcastAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "dashboard:wallet-broadcast");
  } catch {
    go("error", "Security check failed. Please refresh and try again.");
  }

  const user = await requireBusinessScopedUserOrRedirect({
    roles: ["BUSINESS_OWNER"],
    onMissingBusiness: () => redirect("/dashboard"),
  });

  if (
    await blockDemoModeExternalAction({
      actorUserId: user.id,
      businessId: user.businessId,
      attemptedAction: "SEND_WALLET_BROADCAST",
      entityType: "WalletBroadcast",
    })
  ) {
    go("error", "Wallet messages are disabled in demo mode.");
  }

  const outcome = await runWalletBroadcast(
    {
      // The guard above already enforced the role; runWalletBroadcast checks
      // again against the same policy so the rule is covered by tests.
      getUser: async () => user,
      findLastCountedBroadcastAt: async (businessId) => {
        const last = await prisma.walletBroadcast.findFirst({
          where: { businessId, status: { in: [...WALLET_BROADCAST_COOLDOWN_STATUSES] } },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true },
        });
        return last?.sentAt ?? null;
      },
      sendForBusiness: sendGoogleWalletBroadcastForBusiness,
      recordBroadcast: (record) => prisma.walletBroadcast.create({ data: record }),
      now: () => new Date(),
    },
    { header: getString(formData, "header"), body: getString(formData, "body") },
  );

  if (!outcome.ok) {
    if (outcome.code !== "INVALID" && outcome.code !== "COOLDOWN") {
      console.warn("[wallet-broadcast] not sent", { businessId: user.businessId, code: outcome.code });
    }
    revalidatePath(PATH);
    go("error", outcome.error);
  }

  revalidatePath(PATH);
  go(
    "success",
    outcome.status === "SENT"
      ? "Sent. Customers with your card in Google Wallet will see it on their phone shortly."
      : "Sent to some of your programs. One program could not be reached - see the history below.",
  );
}
