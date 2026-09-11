/**
 * UAE vehicle plates.
 *
 * A plate is three parts - emirate, code, number - and people write the same
 * plate a dozen ways: "A12345", "A 12345", "dubai a 12345", "DXB-A-12345".
 * So this mirrors lib/phone.ts exactly: keep what the user typed for display,
 * derive one canonical form for matching, and index the canonical form.
 *
 * Deliberately free of runtime imports so it can be unit tested directly.
 */

export const VEHICLE_EMIRATES = [
  "ABU_DHABI",
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "UMM_AL_QUWAIN",
  "RAS_AL_KHAIMAH",
  "FUJAIRAH",
] as const;

export type VehicleEmirate = (typeof VEHICLE_EMIRATES)[number];

export const vehicleEmirateLabels: Record<VehicleEmirate, string> = {
  ABU_DHABI: "Abu Dhabi",
  DUBAI: "Dubai",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UMM_AL_QUWAIN: "Umm Al Quwain",
  RAS_AL_KHAIMAH: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};

/** Spellings a person might type or say, mapped to the stored enum. */
const EMIRATE_ALIASES: Record<string, VehicleEmirate> = {
  ABUDHABI: "ABU_DHABI", AUH: "ABU_DHABI", AD: "ABU_DHABI",
  DUBAI: "DUBAI", DXB: "DUBAI",
  SHARJAH: "SHARJAH", SHJ: "SHARJAH",
  AJMAN: "AJMAN", AJM: "AJMAN",
  UMMALQUWAIN: "UMM_AL_QUWAIN", UAQ: "UMM_AL_QUWAIN",
  RASALKHAIMAH: "RAS_AL_KHAIMAH", RAK: "RAS_AL_KHAIMAH",
  FUJAIRAH: "FUJAIRAH", FUJ: "FUJAIRAH",
};

/**
 * Only car wash businesses record plates. One predicate, so the enrollment
 * form, the edit form, the customer list and the scanner can never disagree
 * about whether this business is a plate business.
 */
export function businessTracksVehicles(businessType: string | null | undefined): boolean {
  return businessType === "CAR_CARE_CENTER";
}

export function isVehicleEmirate(value: unknown): value is VehicleEmirate {
  return typeof value === "string" && (VEHICLE_EMIRATES as readonly string[]).includes(value);
}

/**
 * Emirates differ in what a "code" even is:
 *
 *   Dubai        letters, including double letters - A-Z, AA, BB, CC, DD
 *   Abu Dhabi    numbers - categories roughly 1-50
 *   Sharjah      numbers - roughly 1-4
 *   Ajman, RAK, Fujairah, Umm Al Quwain
 *                single letters, but the issued sets differ per emirate and
 *                published sources disagree on exactly which
 *
 * So this validates the SHAPE (letter vs number, and length) and never a
 * whitelist of allowed codes. Emirates issue new codes over time, and rejecting
 * a plate that is sitting in front of the washer is far worse than accepting an
 * unusual one.
 */
export const EMIRATE_CODE_TYPE: Record<VehicleEmirate, "LETTER" | "NUMBER"> = {
  ABU_DHABI: "NUMBER",
  SHARJAH: "NUMBER",
  DUBAI: "LETTER",
  AJMAN: "LETTER",
  UMM_AL_QUWAIN: "LETTER",
  RAS_AL_KHAIMAH: "LETTER",
  FUJAIRAH: "LETTER",
};

/** Only Dubai issues double-letter codes. */
const MAX_LETTER_CODE_LENGTH: Record<VehicleEmirate, number> = {
  DUBAI: 2, AJMAN: 1, UMM_AL_QUWAIN: 1, RAS_AL_KHAIMAH: 1, FUJAIRAH: 1,
  ABU_DHABI: 1, SHARJAH: 1,
};

/** A-Z, for the emirates whose published code set is the plain alphabet. */
function alphabet(): string[] {
  return Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
}

/**
 * The codes each emirate is known to issue, for the pick-list at the counter.
 *
 * Sources disagree, and not slightly: Wikipedia has Ajman issuing only
 * A, B, C, D, E and H while licenseplate.ae has the full A-Z, and Wikipedia
 * puts Dubai at A-E plus doubles, which is plainly narrower than what is on
 * the road. So these are the UNION of what published sources claim - a wider
 * list covers more real cars and never fewer.
 *
 * This exists to make entry fast, NOT to decide what is valid. Every form
 * offers "Other" alongside it, and checkVehicleCode still validates only the
 * shape, because a plate sitting in front of the washer has to be enterable
 * whether or not a website ever listed its code.
 */
export const VEHICLE_CODES: Record<VehicleEmirate, readonly string[]> = {
  // Single letters, then the doubles Dubai also issues.
  DUBAI: [
    ...alphabet(),
    "AA", "BB", "CC", "DD", "EE", "FF", "HH", "II", "MM",
  ],
  // Numeric category codes: 1-22 in general circulation, plus 50.
  ABU_DHABI: [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
    "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "50",
  ],
  // The most compact system in the country - every source agrees on 1-4.
  SHARJAH: ["1", "2", "3", "4"],
  AJMAN: alphabet(),
  UMM_AL_QUWAIN: alphabet(),
  RAS_AL_KHAIMAH: alphabet(),
  FUJAIRAH: alphabet(),
};

/**
 * Is this a code the emirate is known to issue? Only used to decide whether an
 * existing plate opens in the dropdown or in the "Other" box - never to reject.
 */
export function isKnownVehicleCode(emirate: VehicleEmirate, code: string | null | undefined): boolean {
  const value = normalizeVehicleCode(code);
  return value !== null && VEHICLE_CODES[emirate].includes(value);
}

export function normalizeVehicleCode(code: string | null | undefined): string | null {
  const value = (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!value || value.length > 2) return null;
  return value;
}

/**
 * Shape check against the emirate. Returns null when it fits, or a message.
 * Deliberately permissive: anything of the right shape passes.
 */
export function checkVehicleCode(emirate: VehicleEmirate, code: string | null | undefined): string | null {
  const value = normalizeVehicleCode(code);
  if (!value) return null; // absent is fine - some plates carry no code

  if (EMIRATE_CODE_TYPE[emirate] === "NUMBER") {
    if (!/^\d{1,2}$/.test(value)) {
      return `${vehicleEmirateLabels[emirate]} plate codes are numbers.`;
    }
    return null;
  }

  if (!/^[A-Z]{1,2}$/.test(value)) {
    return `${vehicleEmirateLabels[emirate]} plate codes are letters.`;
  }
  if (value.length > MAX_LETTER_CODE_LENGTH[emirate]) {
    return `${vehicleEmirateLabels[emirate]} plate codes are a single letter.`;
  }
  return null;
}

/** Plate numbers are 1-5 digits across the emirates. */
export function normalizeVehicleNumber(number: string | null | undefined): string | null {
  const value = (number ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!value || value.length > 5) return null;
  return value;
}

/**
 * The stored, indexed key. Null unless emirate and number are both usable -
 * the code is optional because some plates carry none.
 */
export function normalizePlate(input: {
  emirate: string | null | undefined;
  code: string | null | undefined;
  number: string | null | undefined;
}): string | null {
  if (!isVehicleEmirate(input.emirate)) return null;
  const number = normalizeVehicleNumber(input.number);
  if (!number) return null;
  const code = normalizeVehicleCode(input.code);
  return [input.emirate, code ?? "-", number].join("-");
}

/** What staff and customers see: "Dubai A 12345". */
export function formatPlateDisplay(input: {
  emirate: string | null | undefined;
  code: string | null | undefined;
  number: string | null | undefined;
}): string | null {
  if (!isVehicleEmirate(input.emirate)) return null;
  const number = normalizeVehicleNumber(input.number);
  if (!number) return null;
  const code = normalizeVehicleCode(input.code);
  return [vehicleEmirateLabels[input.emirate], code, number].filter(Boolean).join(" ");
}

/**
 * What the car is, beyond the plate.
 *
 * Colour and size are closed sets, so they are database enums - a car is not
 * going to invent a new size class. Brand and model are open sets and are
 * plain text: new brands reach the UAE market constantly (the Chinese brands
 * alone have added a dozen in a few years), and adding one must be an edit to
 * the list below, never a database migration. Model is free text on purpose -
 * a per-brand model list would be thousands of entries, stale within a year,
 * and two extra taps at a counter where the customer is waiting.
 */
export const VEHICLE_COLOURS = [
  "WHITE", "BLACK", "SILVER", "GREY", "BLUE", "RED", "BROWN", "BEIGE",
  "GOLD", "GREEN", "YELLOW", "ORANGE", "MAROON", "PURPLE", "OTHER",
] as const;

export type VehicleColour = (typeof VEHICLE_COLOURS)[number];

export const vehicleColourLabels: Record<VehicleColour, string> = {
  WHITE: "White", BLACK: "Black", SILVER: "Silver", GREY: "Grey", BLUE: "Blue",
  RED: "Red", BROWN: "Brown", BEIGE: "Beige", GOLD: "Gold", GREEN: "Green",
  YELLOW: "Yellow", ORANGE: "Orange", MAROON: "Maroon", PURPLE: "Purple",
  OTHER: "Other",
};

/** The tiers a car wash actually prices by, smallest first. */
export const VEHICLE_SIZES = [
  "SMALL_CAR", "SEDAN", "SUV", "LARGE_SUV", "PICKUP", "VAN", "MOTORCYCLE",
] as const;

export type VehicleSize = (typeof VEHICLE_SIZES)[number];

export const vehicleSizeLabels: Record<VehicleSize, string> = {
  SMALL_CAR: "Small car",
  SEDAN: "Sedan",
  SUV: "SUV",
  LARGE_SUV: "Large SUV / 4x4",
  PICKUP: "Pickup",
  VAN: "Van",
  MOTORCYCLE: "Motorcycle",
};

export function isVehicleColour(value: unknown): value is VehicleColour {
  return typeof value === "string" && (VEHICLE_COLOURS as readonly string[]).includes(value);
}

export function isVehicleSize(value: unknown): value is VehicleSize {
  return typeof value === "string" && (VEHICLE_SIZES as readonly string[]).includes(value);
}

/**
 * Brands sold or commonly seen in the UAE, in the spelling a customer would
 * recognise. Ordered roughly by how often they turn up on a Sharjah forecourt,
 * so the common ones are reachable without scrolling. "Other" is last and is
 * always available - a list that cannot describe the car in front of the
 * washer is worse than no list.
 */
export const VEHICLE_BRANDS = [
  "Toyota", "Nissan", "Mitsubishi", "Honda", "Hyundai", "Kia", "Mazda",
  "Suzuki", "Lexus", "Infiniti", "Isuzu", "Subaru", "Daihatsu", "Genesis",
  "Ford", "Chevrolet", "GMC", "Jeep", "Dodge", "RAM", "Chrysler", "Cadillac",
  "Lincoln", "Tesla",
  "Mercedes-Benz", "BMW", "Audi", "Volkswagen", "Porsche", "MINI", "Opel",
  "Skoda", "SEAT", "Volvo", "Polestar", "Smart",
  "Land Rover", "Jaguar", "Bentley", "Rolls-Royce", "Aston Martin", "McLaren",
  "Ferrari", "Lamborghini", "Maserati", "Alfa Romeo", "Fiat", "Lotus",
  "Peugeot", "Renault", "Citroen", "MG",
  "BYD", "Chery", "Changan", "Geely", "Haval", "GAC", "JAC", "Jetour",
  "Exeed", "Omoda", "Jaecoo", "Tank", "Hongqi", "Zeekr", "Xpeng", "NIO",
  "Great Wall", "Foton", "Lucid", "KGM",
  "Other",
] as const;

export function isVehicleBrand(value: unknown): value is string {
  return typeof value === "string" && (VEHICLE_BRANDS as readonly string[]).includes(value);
}

/** Free text, so it needs a ceiling and a trim - nothing more. */
export function normalizeVehicleModel(model: string | null | undefined): string | null {
  const value = (model ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  return value || null;
}

/** "White Nissan Patrol" - how staff would say it out loud. */
export function formatVehicleDescription(input: {
  colour: string | null | undefined;
  brand: string | null | undefined;
  model: string | null | undefined;
}): string | null {
  const colour = isVehicleColour(input.colour) && input.colour !== "OTHER" ? vehicleColourLabels[input.colour] : null;
  const brand = isVehicleBrand(input.brand) && input.brand !== "Other" ? input.brand : null;
  const model = normalizeVehicleModel(input.model);
  const parts = [colour, brand, model].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export type ParsedPlateQuery = {
  /** Full canonical key, when the query pinned down all three parts. */
  normalizedPlate: string | null;
  /** Bare digits, for the common case of a washer reading only the number. */
  numberOnly: string | null;
  emirate: VehicleEmirate | null;
  code: string | null;
};

/**
 * Turns whatever went into the search box into something matchable.
 *
 * A washer reading a dirty plate is often only sure of the digits, so a query
 * of "12345" must still find the car. That is why numberOnly exists alongside
 * the exact key: the caller can match either, and show a short list.
 */
export function parsePlateQuery(raw: string): ParsedPlateQuery {
  const empty: ParsedPlateQuery = { normalizedPlate: null, numberOnly: null, emirate: null, code: null };
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return empty;

  // Split into runs of letters and runs of digits, so every separator style
  // people use - "DXB-A-12345", "dxb a 12345", "DXBA12345" - lands on the same
  // token list.
  const tokens = trimmed.toUpperCase().match(/[A-Z]+|[0-9]+/g) ?? [];
  if (tokens.length === 0) return empty;

  // Longest aliases first, so "ABUDHABI" wins over "AD".
  const aliases = Object.entries(EMIRATE_ALIASES).sort((a, b) => b[0].length - a[0].length);

  let emirate: VehicleEmirate | null = null;
  const rest = [...tokens];

  // Pass 1: a run of up to three consecutive letter tokens spelling an emirate.
  // This is what makes "abu dhabi 13 4567" and "ras al khaimah k 900" work -
  // the emirate name is more than one word, and the code must survive it.
  outer: for (let start = 0; start < rest.length && !emirate; start += 1) {
    if (!/^[A-Z]+$/.test(rest[start])) continue;
    for (let span = Math.min(3, rest.length - start); span >= 1; span -= 1) {
      const window = rest.slice(start, start + span);
      if (!window.every((token) => /^[A-Z]+$/.test(token))) continue;
      const match = aliases.find(([alias]) => alias === window.join(""));
      if (match) {
        emirate = match[1];
        rest.splice(start, span);
        break outer;
      }
    }
  }

  // Pass 2: the emirate glued to the code, e.g. "DXBA12345". Only aliases of
  // three or more letters, so a lone "AD" is never carved out of a real code.
  if (!emirate) {
    for (let i = 0; i < rest.length; i += 1) {
      if (!/^[A-Z]+$/.test(rest[i])) continue;
      const match = aliases.find(([alias]) => alias.length >= 3 && rest[i].startsWith(alias) && rest[i] !== alias);
      if (match) {
        emirate = match[1];
        rest[i] = rest[i].slice(match[0].length);
        if (!rest[i]) rest.splice(i, 1);
        break;
      }
    }
  }

  const numberToken = [...rest].reverse().find((token) => /^\d{1,5}$/.test(token)) ?? null;
  const codeToken =
    rest.find((token) => token !== numberToken && (/^[A-Z]{1,2}$/.test(token) || /^\d{1,2}$/.test(token))) ?? null;

  const numberOnly = normalizeVehicleNumber(numberToken);
  const code = normalizeVehicleCode(codeToken);

  return {
    normalizedPlate: emirate && numberOnly ? normalizePlate({ emirate, code, number: numberOnly }) : null,
    numberOnly,
    emirate,
    code,
  };
}
