"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

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
  const [message, setMessage] = useState("");
  const [savingSide, setSavingSide] = useState<"front" | "back" | null>(null);

  async function saveAsImage(side: "front" | "back") {
    const targetSelector = side === "front" ? frontTargetSelector : backTargetSelector;
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) {
      setMessage("Card image is not available yet.");
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
      setMessage(`Loyalty card ${side} image downloaded successfully.`);
    } catch (error) {
      console.error("Loyalty card image export failed", error);
      setMessage("Could not save the card image. Please try again.");
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
          className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          style={!savingSide && buttonColor ? { backgroundColor: buttonColor } : undefined}
        >
          {savingSide === "front" ? "Preparing front..." : "\uD83D\uDCF7 Download Front"}
        </button>
        <button
          type="button"
          onClick={() => saveAsImage("back")}
          disabled={savingSide !== null}
          className="w-full rounded-md border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
          style={!savingSide && buttonColor ? { borderColor: buttonColor, color: buttonColor } : undefined}
        >
          {savingSide === "back" ? "Preparing back..." : "\u25A3 Download Back"}
        </button>
      </div>
      {message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}
