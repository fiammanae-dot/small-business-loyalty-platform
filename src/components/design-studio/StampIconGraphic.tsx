import type { CardDesignStampIcon } from "@/lib/card-design";

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

export function getStampAriaLabel(stampIcon: CardDesignStampIcon) {
  return `${stampIcon.toLowerCase().replace(/_/g, " ")} stamp`;
}

export function StampIconGraphic({
  stampIcon,
  className = "h-4 w-4",
}: {
  stampIcon: CardDesignStampIcon;
  className?: string;
  mode?: "selector" | "customer";
}) {
  return <StampEmoji stampIcon={stampIcon} className={className} />;
}

export function StampSlot({
  stampIcon,
  filled,
  className = "h-9 w-9",
  iconClassName = "h-[18px] w-[18px]",
}: {
  stampIcon: CardDesignStampIcon;
  filled: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)] ${className}`}
      aria-hidden="true"
    >
      <span className={filled ? "opacity-100" : "opacity-30 grayscale-[20%]"}>
        <StampEmoji stampIcon={stampIcon} className={iconClassName} />
      </span>
    </span>
  );
}

function StampEmoji({ stampIcon, className }: { stampIcon: CardDesignStampIcon; className: string }) {
  return (
    <span
      className={`inline-grid select-none place-items-center leading-none ${className}`}
      aria-hidden="true"
      title={getStampAriaLabel(stampIcon)}
      style={{
        fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif",
      }}
    >
      <span className="text-[1.35em] leading-none">{getStampEmoji(stampIcon)}</span>
    </span>
  );
}
