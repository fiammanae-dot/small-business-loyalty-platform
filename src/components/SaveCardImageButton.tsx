"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

type SaveCardImageButtonProps = {
  targetSelector: string;
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

export function SaveCardImageButton({ targetSelector, customerName, buttonColor }: SaveCardImageButtonProps) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveAsImage() {
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) {
      setMessage("Card image is not available yet.");
      return;
    }

    setSaving(true);
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
      link.download = "loyalty-card-" + filenameSafe(customerName) + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("Loyalty card image downloaded successfully.");
    } catch (error) {
      console.error("Loyalty card image export failed", error);
      setMessage("Could not save the card image. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={saveAsImage}
        disabled={saving}
        className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        style={!saving && buttonColor ? { backgroundColor: buttonColor } : undefined}
      >
        {saving ? "Preparing image..." : "\uD83D\uDCF7 Save as Image"}
      </button>
      {message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}
