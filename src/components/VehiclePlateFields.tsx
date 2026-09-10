"use client";

import { useState } from "react";
import {
  EMIRATE_CODE_TYPE,
  VEHICLE_BRANDS,
  VEHICLE_COLOURS,
  VEHICLE_EMIRATES,
  VEHICLE_SIZES,
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

/**
 * Plate entry for car wash businesses.
 *
 * A UAE plate is emirate + code + number, but the code means different things
 * per emirate: Dubai issues letters (including AA/BB/CC/DD), Abu Dhabi and
 * Sharjah issue numbers, the northern emirates issue a single letter. So the
 * code field changes its hint and keyboard as soon as the emirate is picked -
 * a washer entering a plate one-handed should not have to guess.
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
  const selected: VehicleEmirate | null = isVehicleEmirate(emirate) ? emirate : null;
  const codeIsNumeric = selected ? EMIRATE_CODE_TYPE[selected] === "NUMBER" : false;

  const codeHint = !selected
    ? "Pick the emirate first"
    : codeIsNumeric
      ? "Number, e.g. 13"
      : selected === "DUBAI"
        ? "Letter, e.g. A or AA"
        : "Letter, e.g. B";

  const inputClass = `h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none ${focusClass}`;

  return (
    <div className="grid gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      {/* Tells the server the plate fields were actually on screen. Without it
          a form that never rendered them would submit three empty values and
          wipe a plate that is already on file. */}
      <input type="hidden" name="vehicleFieldsPresent" value="1" />
      <div>
        <p className="text-sm font-semibold text-[#111827]">Vehicle</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          All optional. Staff can search by plate number at the counter - the rest
          can be filled in later from the customer&apos;s page.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Emirate</span>
          <select
            name="vehicleEmirate"
            value={emirate}
            onChange={(event) => setEmirate(event.target.value)}
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

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Code</span>
          <input
            name="vehicleCode"
            defaultValue={defaultCode}
            maxLength={2}
            placeholder={codeHint}
            inputMode={codeIsNumeric ? "numeric" : "text"}
            autoCapitalize="characters"
            aria-invalid={Boolean(errors.vehicleCode)}
            aria-describedby={errors.vehicleCode ? "vehicleCode-error" : undefined}
            className={`${inputClass} uppercase`}
          />
          {errors.vehicleCode ? (
            <span id="vehicleCode-error" className="block text-sm text-red-700">{errors.vehicleCode}</span>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#111827]">Plate number</span>
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
      </div>

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
