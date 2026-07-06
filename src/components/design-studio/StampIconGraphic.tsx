import {
  Bean,
  Beaker,
  Brush,
  CakeSlice,
  Car,
  Check,
  ChefHat,
  Circle,
  CircleDot,
  CircleDotDashed,
  Coffee,
  Cookie,
  Croissant,
  Crown,
  Diamond,
  Droplets,
  Flame,
  Gem,
  Gift,
  GlassWater,
  Hamburger,
  Heart,
  Paintbrush,
  Pizza,
  Sandwich,
  Scissors,
  Sparkle,
  Sparkles,
  SprayCan,
  Star,
  ThumbsUp,
  Trophy,
  Utensils,
  UtilityPole,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { CardDesignStampIcon } from "@/lib/card-design";

export const stampIconComponents: Record<CardDesignStampIcon, LucideIcon> = {
  STAR: Star,
  HEART: Heart,
  CHECK: Check,
  CIRCLE: Circle,
  DIAMOND: Diamond,
  GIFT: Gift,
  TROPHY: Trophy,
  CROWN: Crown,
  THUMBS_UP: ThumbsUp,
  FLAME: Flame,
  SCISSORS: Scissors,
  RAZOR: Beaker,
  COMB: Waves,
  BARBER_POLE: UtilityPole,
  COFFEE_CUP: Coffee,
  COFFEE_BEAN: Bean,
  ESPRESSO: Coffee,
  CROISSANT: Croissant,
  COOKIE: Cookie,
  PLATE: Utensils,
  BURGER: Hamburger,
  PIZZA: Pizza,
  CHEF_HAT: ChefHat,
  SANDWICH: Sandwich,
  CAKE: CakeSlice,
  CAR: Car,
  WATER_DROP: Droplets,
  BUBBLES: Sparkles,
  WHEEL: CircleDot,
  SPRAY: SprayCan,
  LIPSTICK: Brush,
  MIRROR: CircleDotDashed,
  MAKEUP_BRUSH: Paintbrush,
  NAIL_POLISH: GlassWater,
  SPARKLE: Sparkle,
  GEM: Gem,
};

export function StampIconGraphic({
  stampIcon,
  className = "h-4 w-4",
  mode = "selector",
}: {
  stampIcon: CardDesignStampIcon;
  className?: string;
  mode?: "selector" | "customer";
}) {
  if (mode === "customer") {
    return <CustomerStampMark stampIcon={stampIcon} className={className} />;
  }

  const Icon = stampIconComponents[stampIcon] ?? Star;
  return <Icon className={className} aria-hidden="true" focusable="false" strokeWidth={2.4} />;
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
      <span className={filled ? "opacity-100" : "opacity-30 grayscale-[25%]"}>
        <StampIconGraphic stampIcon={stampIcon} mode="customer" className={iconClassName} />
      </span>
    </span>
  );
}

const premiumStampMarks: Record<CardDesignStampIcon, string> = {
  STAR: "⭐",
  HEART: "❤️",
  CHECK: "✅",
  CIRCLE: "🔵",
  DIAMOND: "💎",
  GIFT: "🎁",
  TROPHY: "🏆",
  CROWN: "👑",
  THUMBS_UP: "👍",
  FLAME: "🔥",
  SCISSORS: "✂️",
  RAZOR: "🪒",
  COMB: "\u{1F487}",
  BARBER_POLE: "💈",
  COFFEE_CUP: "☕",
  COFFEE_BEAN: "☕",
  ESPRESSO: "☕",
  CROISSANT: "🥐",
  COOKIE: "🍪",
  PLATE: "🍽️",
  BURGER: "🍔",
  PIZZA: "🍕",
  CHEF_HAT: "🍳",
  SANDWICH: "🥪",
  CAKE: "🍰",
  CAR: "🚗",
  WATER_DROP: "💧",
  BUBBLES: "\u{1F9FC}",
  WHEEL: "\u{1F527}",
  SPRAY: "💦",
  LIPSTICK: "💄",
  MIRROR: "\u{1F486}",
  MAKEUP_BRUSH: "🖌️",
  NAIL_POLISH: "💅",
  SPARKLE: "✨",
  GEM: "\u{1F48E}",
};

function stampAriaLabel(stampIcon: CardDesignStampIcon) {
  return `${stampIcon.toLowerCase().replace(/_/g, " ")} stamp`;
}

function CustomerStampMark({ stampIcon, className }: { stampIcon: CardDesignStampIcon; className: string }) {
  const mark = premiumStampMarks[stampIcon] ?? premiumStampMarks.STAR;

  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false" role="img">
      <title>{stampAriaLabel(stampIcon)}</title>
      <ellipse cx="12" cy="9.5" rx="7.5" ry="4.5" fill="#fff" opacity="0.22" transform="rotate(-16 12 9.5)" />
      <text
        x="16"
        y="21.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif"
        fontSize="23"
      >
        {mark}
      </text>
    </svg>
  );
}
