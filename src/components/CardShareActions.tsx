"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { refineWalletPlatformInBrowser, type WalletPlatform } from "@/lib/wallet-platform";
import { auditLoyaltyCardWhatsAppShare } from "@/app/card-share-actions";
import { buildResendCardWhatsAppMessage, buildWelcomeCardWhatsAppMessage, getWhatsAppManualLink } from "@/lib/whatsapp-messages";
import { useLocale, useT } from "@/i18n/client";

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
  cashbackGoogleWalletUrl?: string | null;
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
  /** The customer's language for the WhatsApp text; defaults to the screen's language. */
  messageLocale?: string | null;
};

export function CardShareActions({
  cardUrl,
  businessName,
  customerName,
  recipientPhone,
  auditMembershipUuid,
  whatsappLabel,
  showCopy = true,
  showWallet = true,
  googleWalletUrl,
  appleWalletUrl,
  walletPrograms,
  cashbackAppleWalletUrl,
  cashbackGoogleWalletUrl,
  walletPlatform,
  cardQrCode,
  hideUnavailableWhatsApp = false,
  buttonColor,
  compact = false,
  messageType = "welcome",
  messageLocale,
}: CardShareActionsProps) {
  const t = useT();
  const uiLocale = useLocale();
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
      const input = { businessName, cardUrl, customerName: customerName ?? t("pass.customer"), locale: messageLocale ?? uiLocale };
      return messageType === "resend" ? buildResendCardWhatsAppMessage(input) : buildWelcomeCardWhatsAppMessage(input);
    },
    [businessName, cardUrl, customerName, messageType, messageLocale, uiLocale, t],
  );
  const whatsappUrl = useMemo(() => getWhatsAppManualLink(recipientPhone, shareText), [recipientPhone, shareText]);
  const showWhatsApp = Boolean(whatsappUrl) || !hideUnavailableWhatsApp;
  const disabledWhatsappLabel = recipientPhone ? t("share.invalidPhone") : t("share.noPhone");
  const whatsappButtonLabel = whatsappLabel ?? t("share.sendWhatsapp");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setMessage(t("share.linkCopied"));
    } catch {
      setMessage(t("share.copyUnavailable"));
    }
  }

  async function shareViaWhatsApp() {
    if (!whatsappUrl) {
      setMessage(recipientPhone ? t("share.phoneInvalid") : t("share.phoneRequired"));
      return;
    }

    setSharing(true);
    try {
      if (auditMembershipUuid) {
        await auditLoyaltyCardWhatsAppShare(auditMembershipUuid);
      }
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setMessage(t("share.whatsappPrepared"));
    } catch {
      setMessage(t("share.whatsappLogFailed"));
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
            {t("share.copyLink")}
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
            title={!whatsappUrl ? disabledWhatsappLabel : whatsappButtonLabel}
            className={compact ? "whitespace-nowrap rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] transition business-hover disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500" : "rounded-md px-4 py-3 text-center text-sm font-semibold disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 business-button"}
            style={!compact && whatsappUrl && !sharing && buttonColor ? { backgroundColor: buttonColor } : undefined}
          >
            {sharing ? t("share.preparing") : whatsappUrl ? whatsappButtonLabel : disabledWhatsappLabel}
          </button>
        )}
      </div>
      {!compact && showWhatsApp && !whatsappUrl ? (
        <p className="text-center text-sm font-medium text-[#9A3412]">
          {recipientPhone ? t("share.phoneInvalid") : t("share.phoneRequired")}
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
              <img src={cardQrCode} alt={t("share.qrAlt")} className="h-28 w-28 shrink-0 rounded bg-white" />
            ) : null}
            <div>
              <p className="text-sm font-semibold text-[#111827]">{t("share.addToPhoneWallet")}</p>
              <p className="mt-1 text-sm text-[#64748B]">{t("share.scanToAdd")}</p>
            </div>
          </div>
        ) : walletPrograms ? (
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
                    {t("share.addApple")}
                  </a>
                ) : null}
                {showGoogle ? (
                  <a
                    href={p.googleWalletUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition business-hover"
                  >
                    {t("share.addGoogle")}
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
              {t("share.addApple")}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setMessage(t("share.appleUnavailable"))}
              className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              {t("share.addApple")}
            </button>
          )}
          {googleWalletUrl ? (
            <a
              href={googleWalletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition business-hover"
            >
              {t("share.addGoogle")}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setMessage(t("share.googleUnavailable"))}
              className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition business-hover"
            >
              {t("share.addGoogle")}
            </button>
          )}
        </div>
        )}
        {/* The cashback card is its own pass; each phone gets the button for its own wallet. */}
        {platform !== "desktop" && (cashbackAppleWalletUrl || cashbackGoogleWalletUrl) && walletPrograms && walletPrograms.length > 0 ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{t("share.cashback")}</p>
        ) : null}
        {cashbackAppleWalletUrl && showApple ? (
          <a
            href={cashbackAppleWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border-2 border-black bg-white px-4 py-3 text-center text-sm font-semibold text-black"
          >
            {t("share.addCashbackApple")}
          </a>
        ) : null}
        {cashbackGoogleWalletUrl && showGoogle ? (
          <a
            href={cashbackGoogleWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border-2 border-[#111827] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition business-hover"
          >
            {t("share.addCashbackGoogle")}
          </a>
        ) : null}
        </>
      ) : null}

      {!compact && message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}
