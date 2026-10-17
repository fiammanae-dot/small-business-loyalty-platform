"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { getReadableForeground, hasReadableContrast } from "@/lib/color-contrast";
import { useT } from "@/i18n/client";

type SaveCardImageButtonProps = {
  frontTargetSelector: string;
  backTargetSelector: string;
  customerName: string;
  buttonColor?: string;
};

function filenameSafe(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "customer";
}

export function SaveCardImageButton({ frontTargetSelector, backTargetSelector, customerName, buttonColor }: SaveCardImageButtonProps) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [savingSide, setSavingSide] = useState<"front" | "back" | null>(null);
  const buttonForeground = getReadableForeground(buttonColor);
  const outlineColor = buttonColor && hasReadableContrast(buttonColor, "#FFFFFF", 3) ? buttonColor : "#CBD5E1";
  const outlineTextColor = buttonColor && hasReadableContrast(buttonColor, "#FFFFFF", 4.5) ? buttonColor : "#111827";

  async function saveAsImage(side: "front" | "back") {
    const targetSelector = side === "front" ? frontTargetSelector : backTargetSelector;
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) {
      setMessage(t("share.imageUnavailable"));
      return;
    }

    setSavingSide(side);
    setMessage("");

    try {
      const pixelRatio = Math.max(2, Math.min(window.devicePixelRatio || 2, 3));
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "#ffffff",
        includeQueryParams: true,
        style: {
          transform: "none",
          transformOrigin: "top left",
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "loyalty-card-" + filenameSafe(customerName) + "-" + side + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage(t("share.imageSaved", { side: t(`share.${side}`) }));
    } catch (error) {
      console.error("Loyalty card image export failed", error);
      setMessage(t("share.imageFailed"));
    } finally {
      setSavingSide(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => saveAsImage("front")}
          disabled={savingSide !== null}
          className="w-full rounded-md px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          style={!savingSide && buttonColor ? { backgroundColor: buttonColor, color: buttonForeground } : undefined}
        >
          {savingSide === "front" ? t("share.preparingFront") : `\uD83D\uDCF7 ${t("share.downloadFront")}`}
        </button>
        <button
          type="button"
          onClick={() => saveAsImage("back")}
          disabled={savingSide !== null}
          className="w-full rounded-md border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
          style={!savingSide && buttonColor ? { borderColor: outlineColor, color: outlineTextColor } : undefined}
        >
          {savingSide === "back" ? t("share.preparingBack") : `\u25A3 ${t("share.downloadBack")}`}
        </button>
      </div>
      {message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}
