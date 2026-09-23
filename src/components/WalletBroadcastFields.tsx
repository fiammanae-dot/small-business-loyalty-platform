"use client";

import { useState } from "react";

/**
 * The inputs of the Wallet message composer, with live character counters.
 * The surrounding <form> (server action + CSRF field) is rendered by the page.
 */
export function WalletBroadcastFields({
  headerMax,
  bodyMax,
  disabled,
}: {
  headerMax: number;
  bodyMax: number;
  disabled: boolean;
}) {
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const ready = header.trim().length > 0 && body.trim().length > 0;

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <label className="block">
        <span className="flex items-baseline justify-between text-sm font-semibold text-[#171A21]">
          Headline
          <Counter value={header.length} max={headerMax} />
        </span>
        <input
          name="header"
          value={header}
          maxLength={headerMax}
          required
          onChange={(event) => {
            setHeader(event.target.value);
            setConfirming(false);
          }}
          placeholder="e.g. Double stamps this weekend"
          className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="flex items-baseline justify-between text-sm font-semibold text-[#171A21]">
          Message
          <Counter value={body.length} max={bodyMax} />
        </span>
        <textarea
          name="body"
          value={body}
          maxLength={bodyMax}
          required
          rows={5}
          onChange={(event) => {
            setBody(event.target.value);
            setConfirming(false);
          }}
          placeholder="Tell your customers what's new. Keep it short and friendly."
          className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"
        />
      </label>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>This goes to every customer with your card in Google Wallet, and you can send again only after 12 hours.</span>
          <button type="submit" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
            Yes, send now
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!ready}
          onClick={() => setConfirming(true)}
          className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send to Wallet customers
        </button>
      )}
    </fieldset>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={`text-xs font-normal ${value >= max ? "text-red-600" : "text-[#7A8091]"}`}>
      {value}/{max}
    </span>
  );
}
