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
}: {
  stampIcon: CardDesignStampIcon;
  className?: string;
}) {
  const Icon = stampIconComponents[stampIcon] ?? Star;
  return <Icon className={className} aria-hidden="true" focusable="false" strokeWidth={2.4} />;
}
