"use client";

import { useState } from "react";
import {
  EMIRATE_CODE_TYPE,
  VEHICLE_BRANDS,
  VEHICLE_CODES,
  VEHICLE_COLOURS,
  VEHICLE_EMIRATES,
  VEHICLE_SIZES,
  isKnownVehicleCode,
  isVehicleEmirate,
  vehicleColourLabels,
  vehicleEmirateLabels,
  vehicleSizeLabels,
  type VehicleEmirate,
} from "@/lib/vehicles";

type VehiclePlateFieldsProps = {
  defaultEmirate?: string;
  defaultCode?: string;
  defaultNumber?: string;
  defaultBrand?: string;
  defaultModel?: string;
  defaultColour?: string;
  defaultSize?: string;
  errors?: {
    vehicleEmirate?: string;
    vehicleCode?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
  };
  focusClass?: string;
};

/** Sentinels for the code dropdown. Neither is ever stored. */
const NO_CODE = "__none__";
const OTHER_CODE = "__other__";

/**
 * Plate entry for car wash businesses, one step at a time.
 *
 * Emirate, then code, then number. The steps are revealed in order because the
 * code is meaningless until the emirate is known - Dubai issues letters, Abu
 * Dhabi and Sharjah issue numbers, and the northern emirates issue a single
 * letter - so showing a code box first would only invite a wrong answer.
 *
 * The code is a pick-list rather than free text so a washer taps once instead
 * of guessing a spelling. But published code sets disagree with each other and
 * emirates add codes over time, so the list always carries an "Other" escape:
 * a plate that is sitting in front of the washer must be enterable whether or
 * not any website ever listed its code. "No code" is there for the same
 * reason - some plates genuinely carry none, and without it those cars would
 * be stuck at step two forever.
 */
export function VehiclePlateFields({
  defaultEmirate = "",
  defaultCode = "",
  defaultNumber = "",
  defaultBrand = "",
  defaultModel = "",
  defaultColour = "",
  defaultSize = "",
  errors = {},
  focusClass = "business-ring focus:ring-0",
}: VehiclePlateFieldsProps) {
  const [emirate, setEmirate] = useState(defaultEmirate);

  // Reopen an existing plate in whichever control it came from: a code the
  // emirate is known to issue belongs in the dropdown, anything else in the
  // "Other" box, so editing never silently discards an unusual code.
  const [codeChoice, setCodeChoice] = useState(() => {
    if (!isVehicleEmirate(defaultEmirate)) return "";
    if (defaultCode) return isKnownVehicleCode(defaultEmirate, defaultCode) ? defaultCode.toUpperCase() : OTHER_CODE;
    // An existing plate with a number but no code was deliberately codeless.
    return defaultNumber ? NO_CODE : "";
  });
  const [otherCode, setOtherCode] = useState(
    isVehicleEmirate(defaultEmirate) && defaultCode && !isKnownVehicleCode(defaultEmirate, defaultCode)
      ? defaultCode.toUpperCase()
      : "",
  );

  const selected: VehicleEmirate | null = isVehicleEmirate(emirate) ? emirate : null;
  const codeIsNumeric = selected ? EMIRATE_CODE_TYPE[selected] === "NUMBER" : false;

  // What actually gets submitted, whichever control produced it.
  const submittedCode =
    codeChoice === NO_CODE || codeChoice === "" ? "" : codeChoice === OTHER_CODE ? otherCode : codeChoice;

  // Step 3 opens as soon as step 2 has an answer - including "No code", and
  // including "Other" before it is typed, so nobody can get trapped.
  const showNumber = Boolean(selected) && codeChoice !== "";

  const inputClass = `h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none ${focusClass}`;
  const stepLabel = "text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]";

  return (
    <div className="grid gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      {/* Tells the server the plate fields were actually on screen. Without it
          a form that never rendered them would submit empty values and wipe a
          plate that is already on file. */}
      <input type="hidden" name="vehicleFieldsPresent" value="1" />
      {/* The resolved code, so the server never sees a sentinel. */}
      <input type="hidden" name="vehicleCode" value={submittedCode} />

      <div>
        <p className="text-sm font-semibold text-[#111827]">Vehicle</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          All optional. Staff can search by plate number at the counter - the rest
          can be filled in later from the customer&apos;s page.
        </p>
      </div>

      {/* Step 1 - emirate. */}
      <label className="space-y-2 md:max-w-xs">
        <span className={stepLabel}>Step 1 · Emirate</span>
        <select
          name="vehicleEmirate"
          value={emirate}
          onChange={(event) => {
            setEmirate(event.target.value);
            // Codes are emirate-specific, so an earlier answer is now wrong.
            setCodeChoice("");
            setOtherCode("");
          }}
          aria-invalid={Boolean(errors.vehicleEmirate)}
          aria-describedby={errors.vehicleEmirate ? "vehicleEmirate-error" : undefined}
          className={inputClass}
        >
          <option value="">Not recorded</option>
          {VEHICLE_EMIRATES.map((value) => (
            <option key={value} value={value}>
              {vehicleEmirateLabels[value]}
            </option>
          ))}
        </select>
        {errors.vehicleEmirate ? (
          <span id="vehicleEmirate-error" className="block text-sm text-red-700">{errors.vehicleEmirate}</span>
        ) : null}
      </label>

      {/* Step 2 - code, from the codes this emirate issues. */}
      {selected ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={stepLabel}>
              Step 2 · {vehicleEmirateLabels[selected]} code
            </span>
            <select
              value={codeChoice}
              onChange={(event) => setCodeChoice(event.target.value)}
              aria-invalid={Boolean(errors.vehicleCode)}
              aria-describedby={errors.vehicleCode ? "vehicleCode-error" : undefined}
              className={inputClass}
            >
              <option value="">{codeIsNumeric ? "Select the number on the plate" : "Select the letter on the plate"}</option>
              {VEHICLE_CODES[selected].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
              <option value={NO_CODE}>This plate has no code</option>
              <option value={OTHER_CODE}>Other - not in this list</option>
            </select>
            {errors.vehicleCode ? (
              <span id="vehicleCode-error" className="block text-sm text-red-700">{errors.vehicleCode}</span>
            ) : null}
          </label>

          {codeChoice === OTHER_CODE ? (
            <label className="space-y-2">
              <span className={stepLabel}>Type the code</span>
              <input
                value={otherCode}
                onChange={(event) => setOtherCode(event.target.value.toUpperCase())}
                maxLength={2}
                placeholder={codeIsNumeric ? "e.g. 27" : "e.g. Q"}
                inputMode={codeIsNumeric ? "numeric" : "text"}
                autoCapitalize="characters"
                className={inputClass}
              />
              <span className="block text-xs text-[#6B7280]">
                Codes change over time. Enter what is printed on the plate.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {/* Step 3 - the number. */}
      {showNumber ? (
        <label className="space-y-2 md:max-w-xs">
          <span className={stepLabel}>Step 3 · Plate number</span>
          <input
            name="vehicleNumber"
            defaultValue={defaultNumber}
            maxLength={5}
            placeholder="e.g. 12345"
            inputMode="numeric"
            aria-invalid={Boolean(errors.vehicleNumber)}
            aria-describedby={errors.vehicleNumber ? "vehicleNumber-error" : undefined}
            className={inputClass}
          />
          {errors.vehicleNumber ? (
            <span id="vehicleNumber-error" className="block text-sm text-red-700">{errors.vehicleNumber}</span>
          ) : null}
        </label>
      ) : emirate === defaultEmirate ? (
        // Step 3 is not on screen yet, but a plate already on file must survive
        // a save that never reached it. Only while the emirate is untouched:
        // once staff pick a different emirate they are entering a different
        // plate, and pairing the new emirate with the old number would invent
        // a plate that does not exist.
        <input type="hidden" name="vehicleNumber" value={defaultNumber} />
      ) : null}

      {/* What the car is. Brand and colour are pick-lists because staff should
          not be inventing spellings; model is free text because a per-brand
          model list would be thousands of entries, stale within a year, and two
          extra taps while the customer waits. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Brand</span>
          <select name="vehicleBrand" defaultValue={defaultBrand} className={inputClass}>
            <option value="">Not recorded</option>
            {VEHICLE_BRANDS.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Model</span>
          <input
            name="vehicleModel"
            defaultValue={defaultModel}
            maxLength={40}
            placeholder="e.g. Patrol"
            aria-invalid={Boolean(errors.vehicleModel)}
            aria-describedby={errors.vehicleModel ? "vehicleModel-error" : undefined}
            className={inputClass}
          />
          {errors.vehicleModel ? (
            <span id="vehicleModel-error" className="block text-sm text-red-700">{errors.vehicleModel}</span>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Colour</span>
          <select name="vehicleColour" defaultValue={defaultColour} className={inputClass}>
            <option value="">Not recorded</option>
            {VEHICLE_COLOURS.map((colour) => (
              <option key={colour} value={colour}>{vehicleColourLabels[colour]}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Size</span>
          <select name="vehicleSize" defaultValue={defaultSize} className={inputClass}>
            <option value="">Not recorded</option>
            {VEHICLE_SIZES.map((size) => (
              <option key={size} value={size}>{vehicleSizeLabels[size]}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
