import { resolveCardDesign, resolveCustomStampIconUrl, type CardDesignInput, type CardDesignStampIcon } from "@/lib/card-design";

/**
 * The one stamp icon a card shows, everywhere.
 *
 * The business picks it in the card designer (design.stampIcon). The web card,
 * the design previews and the Apple/Google wallet stamp picture all turn that
 * choice into the same emoji here, and draw it from the same bundled Twemoji
 * artwork (src/lib/wallet/stamp-icons.ts), so the icon is identical on every
 * surface and every phone.
 */
export const stampEmojiMarks: Record<CardDesignStampIcon, string> = {
  STAR: "\u2B50",
  HEART: "\u2764\uFE0F",
  CHECK: "\u2705",
  CIRCLE: "\u{1F535}",
  DIAMOND: "\u{1F48E}",
  GIFT: "\u{1F381}",
  TROPHY: "\u{1F3C6}",
  CROWN: "\u{1F451}",
  THUMBS_UP: "\u{1F44D}",
  FLAME: "\u{1F525}",
  SCISSORS: "\u2702\uFE0F",
  RAZOR: "\u{1FA92}",
  COMB: "\u{1F487}",
  BARBER_POLE: "\u{1F488}",
  COFFEE_CUP: "\u2615",
  COFFEE_BEAN: "\u{1FAD8}",
  ESPRESSO: "\u2615",
  CROISSANT: "\u{1F950}",
  COOKIE: "\u{1F36A}",
  PLATE: "\u{1F37D}\uFE0F",
  BURGER: "\u{1F354}",
  PIZZA: "\u{1F355}",
  CHEF_HAT: "\u{1F9D1}\u200D\u{1F373}",
  SANDWICH: "\u{1F96A}",
  CAKE: "\u{1F370}",
  CAR: "\u{1F697}",
  WATER_DROP: "\u{1F4A7}",
  BUBBLES: "\u2728",
  WHEEL: "\u{1F6DE}",
  SPRAY: "\u{1F4A6}",
  LIPSTICK: "\u{1F484}",
  MIRROR: "\u{1FA9E}",
  MAKEUP_BRUSH: "\u{1F58C}\uFE0F",
  NAIL_POLISH: "\u{1F485}",
  SPARKLE: "\u2728",
  GEM: "\u{1F48E}",
  TULIP: "\u{1F337}",
  ROSE: "\u{1F339}",
  WATER_LILY: "\u{1FAB7}",
  HIBISCUS: "\u{1F33A}",
  CHERRY_BLOSSOM: "\u{1F338}",
  SUNFLOWER: "\u{1F33B}",
  DAISY: "\u{1F33C}",
  HYACINTH: "\u{1FABB}",
  BOUQUET: "\u{1F490}",
  PERFUME_BOTTLE: "\u{1F9F4}",
  OUD_WOOD: "\u{1FAB5}",
  OIL_LAMP: "\u{1FA94}",
  CANDLE: "\u{1F56F}\uFE0F",
  SCENT: "\u{1F4A8}",
  AMPHORA: "\u{1F3FA}",
  HERBS: "\u{1F33F}",
  LEAVES: "\u{1F343}",
  CRESCENT_MOON: "\u{1F319}",
  PALM_TREE: "\u{1F334}",
  RIBBON: "\u{1F380}",
  SHOPPING_BAGS: "\u{1F6CD}\uFE0F",
  JAR: "\u{1FAD9}",
  SYRINGE: "\u{1F489}",
  PILL: "\u{1F48A}",
  STETHOSCOPE: "\u{1FA7A}",
  BANDAGE: "\u{1FA79}",
  TOOTH: "\u{1F9B7}",
  DNA: "\u{1F9EC}",
  MICROSCOPE: "\u{1F52C}",
  TEST_TUBE: "\u{1F9EA}",
  CLINIC: "\u{1F3E5}",
  MEDICAL_SYMBOL: "\u2695\uFE0F",
  MENDING_HEART: "\u2764\uFE0F\u200D\u{1FA79}",
  SPARKLING_HEART: "\u{1F496}",
  LASER: "\u26A1",
  SUN: "\u2600\uFE0F",
  SPONGE: "\u{1F9FD}",
  SOAP: "\u{1F9FC}",
  BATHTUB: "\u{1F6C1}",
  FACE_MASSAGE: "\u{1F486}",
  LIPS: "\u{1F444}",
  EYE: "\u{1F441}\uFE0F",
  SAUNA: "\u{1F9D6}",
  THERMOMETER: "\u{1F321}\uFE0F",
  DOCTOR: "\u{1F9D1}\u200D\u2695\uFE0F",
  WOMAN_DOCTOR: "\u{1F469}\u200D\u2695\uFE0F",
  YOGA: "\u{1F9D8}",
  GLOWING_STAR: "\u{1F31F}",
};

export function getStampEmoji(stampIcon: CardDesignStampIcon) {
  return stampEmojiMarks[stampIcon] ?? stampEmojiMarks.STAR;
}

/** The emoji for a saved card design (defaults included), as every surface draws it. */
export function stampEmojiForDesign(cardDesign: CardDesignInput | unknown): string {
  return getStampEmoji(resolveCardDesign(cardDesign as CardDesignInput).stampIcon);
}

/** The stamp icon the business uploaded for this design, if any. */
export function customStampIconForDesign(cardDesign: CardDesignInput | unknown): string | null {
  if (!cardDesign || typeof cardDesign !== "object") return null;
  return resolveCustomStampIconUrl((cardDesign as { customStampIconUrl?: unknown }).customStampIconUrl);
}
