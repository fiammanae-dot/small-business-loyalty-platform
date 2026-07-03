import {
  Bean,
  Beaker,
  Brush,
  Car,
  Check,
  ChefHat,
  Circle,
  CircleDot,
  CircleDotDashed,
  Coffee,
  Diamond,
  Droplets,
  Gift,
  GlassWater,
  Hamburger,
  Heart,
  Paintbrush,
  Pizza,
  Scissors,
  Sparkles,
  Star,
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
  SCISSORS: Scissors,
  RAZOR: Beaker,
  COMB: Waves,
  BARBER_POLE: UtilityPole,
  COFFEE_CUP: Coffee,
  COFFEE_BEAN: Bean,
  ESPRESSO: Coffee,
  PLATE: Utensils,
  BURGER: Hamburger,
  PIZZA: Pizza,
  CHEF_HAT: ChefHat,
  CAR: Car,
  WATER_DROP: Droplets,
  BUBBLES: Sparkles,
  WHEEL: CircleDot,
  LIPSTICK: Brush,
  MIRROR: CircleDotDashed,
  MAKEUP_BRUSH: Paintbrush,
  NAIL_POLISH: GlassWater,
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

const premiumStampMarks: Record<CardDesignStampIcon, string> = {
  STAR: "★",
  HEART: "♥",
  CHECK: "✓",
  CIRCLE: "●",
  DIAMOND: "◆",
  GIFT: "🎁",
  SCISSORS: "✂",
  RAZOR: "▰",
  COMB: "≋",
  BARBER_POLE: "▧",
  COFFEE_CUP: "☕",
  COFFEE_BEAN: "◖",
  ESPRESSO: "☕",
  PLATE: "◉",
  BURGER: "☰",
  PIZZA: "◢",
  CHEF_HAT: "♨",
  CAR: "▰",
  WATER_DROP: "💧",
  BUBBLES: "✦",
  WHEEL: "◉",
  LIPSTICK: "▮",
  MIRROR: "◌",
  MAKEUP_BRUSH: "╱",
  NAIL_POLISH: "▴",
};

function CustomerStampMark({ stampIcon, className }: { stampIcon: CardDesignStampIcon; className: string }) {
  const mark = premiumStampMarks[stampIcon] ?? premiumStampMarks.STAR;
  const isEmojiLike = stampIcon === "GIFT" || stampIcon === "WATER_DROP" || stampIcon === "COFFEE_CUP" || stampIcon === "ESPRESSO";

  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false" role="img">
      <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.14" />
      <circle cx="16" cy="16" r="11.5" fill="currentColor" opacity="0.08" />
      <text
        x="16"
        y={isEmojiLike ? "20.4" : "20.8"}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily="ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI Symbol', 'Apple Color Emoji', sans-serif"
        fontSize={isEmojiLike ? "16" : "18"}
        fontWeight="900"
      >
        {mark}
      </text>
    </svg>
  );
}
