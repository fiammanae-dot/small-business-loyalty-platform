import { resolveCardDesign, type CardDesignInput, type CardDesignStampIcon } from "@/lib/card-design";

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
};

export function getStampEmoji(stampIcon: CardDesignStampIcon) {
  return stampEmojiMarks[stampIcon] ?? stampEmojiMarks.STAR;
}

/** The emoji for a saved card design (defaults included), as every surface draws it. */
export function stampEmojiForDesign(cardDesign: CardDesignInput | unknown): string {
  return getStampEmoji(resolveCardDesign(cardDesign as CardDesignInput).stampIcon);
}
