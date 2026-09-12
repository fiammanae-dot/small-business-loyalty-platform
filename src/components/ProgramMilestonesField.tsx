"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type MilestoneDraft = {
  atStamp: string;
  rewardName: string;
  rewardDescription: string;
};

let nextKey = 0;

/**
 * Rewards before the card is full.
 *
 * Al Bab Al Abyad's paper card gives 50% off at visit 5 and a free wash at
 * visit 9. The reward at 5 is not a smaller prize - it is a retention device
 * placed where customers drift, and the business spends a discount at the
 * halfway point to buy the second half of the card.
 *
 * The reward that COMPLETES the card is edited above this component, as it
 * always has been. Only the earlier ones live here, so an owner cannot delete
 * the completing reward, create a second one, or leave the card with none.
 */
export function ProgramMilestonesField({
  initialMilestones = [],
  requiredStamps: initialRequiredStamps,
}: {
  initialMilestones?: MilestoneDraft[];
  /** The card length when the form loaded; tracked live from here on. */
  requiredStamps: number;
}) {
  const [rows, setRows] = useState(() =>
    initialMilestones.map((milestone) => ({ ...milestone, key: `m${nextKey++}` })),
  );
  const [requiredStamps, setRequiredStamps] = useState(initialRequiredStamps);
  const containerRef = useRef<HTMLDivElement>(null);

  // This component watches the Required Stamps input rather than receiving its
  // value as a prop. Lifting that state would mean making the whole program
  // form a client component, which drags server-only modules (csrf, secrets)
  // into the browser bundle and fails the build.
  useEffect(() => {
    const input = containerRef.current
      ?.closest("form")
      ?.querySelector<HTMLInputElement>('input[name="requiredStamps"]');
    if (!input) return;
    const read = () => setRequiredStamps(Number(input.value) || 1);
    read();
    input.addEventListener("input", read);
    return () => input.removeEventListener("input", read);
  }, []);

  const lastBefore = Math.max(1, requiredStamps - 1);

  function update(key: string, patch: Partial<MilestoneDraft>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div ref={containerRef} className="grid gap-3">
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">
          No extra rewards yet. Customers get{" "}
          <span className="font-semibold text-[#111827]">the reward above</span> when they complete the card.
        </p>
      ) : null}

      {rows.map((row) => {
        const at = Number(row.atStamp);
        // The mistake worth catching early: a milestone at or past the end
        // competes with the reward that completes the card.
        const tooLate = Number.isFinite(at) && at >= requiredStamps && row.atStamp !== "";
        return (
          <div key={row.key} className="grid gap-3 rounded-md border border-[#E5E7EB] bg-white p-3 md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-start">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6B7280]">On visit</span>
              <input
                name="milestoneAtStamp"
                value={row.atStamp}
                onChange={(event) => update(row.key, { atStamp: event.target.value.replace(/\D/g, "") })}
                inputMode="numeric"
                placeholder={String(Math.min(5, lastBefore))}
                aria-invalid={tooLate}
                className={`h-11 w-full rounded-md border px-3 text-sm outline-none business-ring focus:ring-0 ${
                  tooLate ? "border-red-300" : "border-[#E5E7EB]"
                }`}
              />
              {tooLate ? (
                <span className="block text-xs text-red-700">Must be {lastBefore} or earlier.</span>
              ) : null}
            </label>

            <div className="grid gap-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6B7280]">Customer gets</span>
                <input
                  name="milestoneRewardName"
                  value={row.rewardName}
                  onChange={(event) => update(row.key, { rewardName: event.target.value })}
                  maxLength={60}
                  placeholder="50% off a wash"
                  className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0"
                />
              </label>
              <input
                name="milestoneRewardDescription"
                value={row.rewardDescription}
                onChange={(event) => update(row.key, { rewardDescription: event.target.value })}
                maxLength={120}
                placeholder="Optional detail for the customer's card"
                className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0"
              />
            </div>

            <button
              type="button"
              onClick={() => setRows((current) => current.filter((candidate) => candidate.key !== row.key))}
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#6B7280] transition hover:border-red-200 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </button>
          </div>
        );
      })}

      <div>
        <button
          type="button"
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: `m${nextKey++}`, atStamp: "", rewardName: "", rewardDescription: "" },
            ])
          }
          className="inline-flex h-11 items-center gap-1.5 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827] transition business-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add a reward before the card is full
        </button>
        <p className="mt-2 text-sm text-[#6B7280]">
          A reward partway through gives customers a reason to come back before the
          card is finished. They keep their stamps and carry on.
        </p>
      </div>
    </div>
  );
}
