"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
};

export function CopyButton({ value, label = "Copy link", copiedLabel = "Copied." }: CopyButtonProps) {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(copiedLabel);
    } catch {
      setMessage("Copy is not available in this browser.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]"
      >
        {label}
      </button>
      {message ? <p className="mt-2 text-xs font-medium text-[#F97316]">{message}</p> : null}
    </div>
  );
}
