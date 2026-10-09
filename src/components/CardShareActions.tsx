"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { refineWalletPlatformInBrowser, type WalletPlatform } from "@/lib/wallet-platform";
import { auditLoyaltyCardWhatsAppShare } from "@/app/card-share-actions";
import { buildResendCardWhatsAppMessage, buildWelcomeCardWhatsAppMessage, getWhatsAppManualLink } from "@/lib/whatsapp-messages";

type CardShareActionsProps = {
  cardUrl: string;
  businessName: string;
  customerName?: string;
  recipientPhone?: string | null;
  auditMembershipUuid?: string;
  whatsappLabel?: string;
  showCopy?: boolean;
  showWallet?: boolean;
  googleWalletUrl?: string | null;
  appleWalletUrl?: string | null;
  walletPrograms?: { name: string; appleWalletUrl: string; googleWalletUrl: string }[];
  cashbackAppleWalletUrl?: string | null;
  /**
   * The customer's own card page passes the device's wallet: only the button
   * that device can open is shown (a QR code on computers). Staff screens leave
   * it unset and keep both buttons, since they may send a card to either phone.
   */
  walletPlatform?: WalletPlatform;
  /** QR code of the card link, shown on computers so the customer can switch to their phone. */
  cardQrCode?: string | null;
  /** On the customer's own page an unusable WhatsApp button is hidden rather than shown as an error. */
  hideUnavailableWhatsApp?: boolean;
  buttonColor?: string;
  compact?: boolean;
  messageType?: "welcome" | "resend";
};

export function CardShareActions({
  cardUrl,
  businessName,
  customerName = "Customer",
  recipientPhone,
  auditMembershipUuid,
  whatsappLabel = "Send via WhatsApp",
  showCopy = true,
  showWallet = true,
  googleWalletUrl,
  appleWalletUrl,
  walletPrograms,
  cashbackAppleWalletUrl,
  walletPlatform,
  cardQrCode,
  hideUnavailableWhatsApp = false,
  buttonColor,
  compact = false,
  messageType = "welcome",
}: CardShareActionsProps) {
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<WalletPlatform | undefined>(walletPlatform);
  useEffect(() => {
    if (walletPlatform) setPlatform(refineWalletPlatformInBrowser(walletPlatform, navigator.userAgent, navigator.maxTouchPoints ?? 0));
  }, [walletPlatform]);
  const showApple = platform !== "google" && platform !== "desktop";
  const showGoogle = platform !== "apple" && platform !== "desktop";
  const [sharing, setSharing] = useState(false);
  const shareText = useMemo(
    () => {
      const input = { businessName, cardUrl, customerName };
      return messageType === "resend" ? buildResendCardWhatsAppMessage(input) : buildWelcomeCardWhatsAppMessage(input);
    },
    [businessName, cardUrl, customerName, messageType],
  );
  const whatsappUrl = useMemo(() => getWhatsAppManualLink(recipientPhone, shareText), [recipientPhone, shareText]);
  const showWhatsApp = Boolean(whatsappUrl) || !hideUnavailableWhatsApp;
  const disabledWhatsappLabel = recipientPhone ? "Invalid phone" : "No phone";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setMessage("Card link copied.");
    } catch {
      setMessage("Copy is not available in this browser.");
    }
  }

  async function shareViaWhatsApp() {
    if (!whatsappUrl) {
      setMessage(recipientPhone ? "Customer phone number is invalid." : "Customer phone number required.");
      return;
    }

    setSharing(true);
    try {
      if (auditMembershipUuid) {
        await auditLoyaltyCardWhatsAppShare(auditMembershipUuid);
      }
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setMessage("WhatsApp message prepared.");
    } catch {
      setMessage("WhatsApp share could not be logged. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className={compact ? "" : "space-y-3"}>
      <div className={compact ? "flex items-center gap-2" : `grid gap-3 ${showCopy && showWhatsApp ? "sm:grid-cols-2" : ""}`}>
        {showCopy ? (
          <button
            type="button"
            onClick={copyLink}
            className={compact ? "rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] transition business-hover" : "rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition business-hover"}
          >
            Copy card link
          </button>
        ) : null}
        {!showWhatsApp ? null : compact && !whatsappUrl ? (
          <span
            title={disabledWhatsappLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700"
            aria-label={disabledWhatsappLabel}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <button
            type="button"
            onClick={shareViaWhatsApp}
            disabled={!whatsappUrl || sharing}
            title={!whatsappUrl ? disabledWhatsappLabel : whatsappLabel}
            className={compact ? "whitespace-nowrap rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] transition business-hover disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500" : "rounded-md px-4 py-3 text-center text-sm font-semibold disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 business-button"}
            style={!compact && whatsappUrl && !sharing && buttonColor ? { backgroundColor: buttonColor } : undefined}
          >
            {sharing ? "Preparing..." : whatsappUrl ? whatsappLabel : disabledWhatsappLabel}
          </button>
        )}
      </div>
      {!compact && showWhatsApp && !whatsappUrl ? (
        <p className="text-center text-sm font-medium text-[#9A3412]">
          {recipientPhone ? "Customer phone number is invalid." : "Customer phone number required."}
        </p>
      ) : null}

      {showWallet ? (
        <>
        {platform === "desktop" ? (
          // A computer cannot hold a wallet pass: send the customer to their phone,
          // where the card page shows the one button that phone can open.
          <div className="flex items-center gap-4 rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            {cardQrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cardQrCode} alt="QR code to open this card on your phone" className="h-28 w-28 shrink-0 rounded bg-white" />
            ) : null}
            <div>
              <p className="text-sm font-semibold text-[#111827]">Add this card to your phone&apos;s wallet</p>
              <p className="mt-1 text-sm text-[#64748B]">Scan with your phone&apos;s camera, then tap the Add to Wallet button that appears.</p>
            </div>
          </div>
        ) : walletPrograms && walletPrograms.length > 0 ? (
          walletPrograms.map((p) => (
            <div key={p.name} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{p.name}</p>
              <div className={`grid gap-3 ${showApple && showGoogle ? "sm:grid-cols-2" : ""}`}>
                {showApple ? (
                  <a
                    href={p.appleWalletUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-black px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Add to Apple Wallet
                  </a>
                ) : null}
                {showGoogle ? (
                  <a
                    href={p.googleWalletUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition business-hover"
                  >
                    Add to Google Wallet
                  </a>
                ) : null}
              </div>
            </div>
          ))
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {appleWalletUrl ? (
            <a
              href={appleWalletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-black px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Add to Apple Wallet
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setMessage("Apple Wallet pass is not available yet.")}
              className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              Add to Apple Wallet
            </button>
          )}
          {googleWalletUrl ? (
            <a
              href={googleWalletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition business-hover"
            >
              Add to Google Wallet
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setMessage("Google Wallet is not available for this card yet.")}
              className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition business-hover"
            >
              Add to Google Wallet
            </button>
          )}
        </div>
        )}
        {/* The cashback card is an Apple pass only, so it is offered only where Apple Wallet exists. */}
        {cashbackAppleWalletUrl && showApple ? (
          <a
            href={cashbackAppleWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border-2 border-black bg-white px-4 py-3 text-center text-sm font-semibold text-black"
          >
            Add Cashback card to Apple Wallet
          </a>
        ) : null}
        </>
      ) : null}

      {!compact && message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}
