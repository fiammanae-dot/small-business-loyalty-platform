import type { DesignStudioBackgroundGalleryOption } from "@/lib/design-studio";

const backgroundGalleryPreviewStyles: Record<string, { background: string; pattern: string }> = {
  "minimal-white": { background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)", pattern: "none" },
  "soft-gradient": { background: "linear-gradient(135deg, #FFFFFF 0%, #FDBA74 100%)", pattern: "none" },
  "dark-premium": { background: "linear-gradient(135deg, #111827 0%, #334155 100%)", pattern: "none" },
  "luxury-gold": {
    background: "linear-gradient(135deg, #111827 0%, #92400E 52%, #FDE68A 100%)",
    pattern: "repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 12px)",
  },
  glass: { background: "linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(219,234,254,0.74) 100%)", pattern: "none" },
  "coffee-pattern": {
    background: "linear-gradient(135deg, #78350F 0%, #F59E0B 100%)",
    pattern: "radial-gradient(ellipse at 14px 12px, rgba(255,255,255,0.24) 0 5px, transparent 6px)",
  },
  "salon-marble": {
    background: "linear-gradient(135deg, #FDF2F8 0%, #FBCFE8 48%, #FFFFFF 100%)",
    pattern: "radial-gradient(circle at 16px 16px, rgba(190,24,93,0.16) 0 5px, transparent 6px)",
  },
  "restaurant-texture": {
    background: "linear-gradient(135deg, #7F1D1D 0%, #EA580C 100%)",
    pattern: "repeating-radial-gradient(circle at 10px 10px, rgba(255,255,255,0.18) 0 2px, transparent 3px 18px)",
  },
  "modern-mesh": {
    background: "linear-gradient(135deg, #0F172A 0%, #0EA5E9 100%)",
    pattern: "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.22) 0 18%, transparent 19%), radial-gradient(ellipse at 80% 70%, rgba(255,255,255,0.16) 0 16%, transparent 17%)",
  },
  "car-wash-bubbles": {
    background: "linear-gradient(135deg, #ECFEFF 0%, #06B6D4 100%)",
    pattern: "radial-gradient(circle at 12px 12px, rgba(255,255,255,0.5) 0 4px, transparent 5px), radial-gradient(circle at 32px 28px, rgba(255,255,255,0.34) 0 3px, transparent 4px)",
  },
};

export function BackgroundGalleryThumbnail({ option }: { option: DesignStudioBackgroundGalleryOption }) {
  const style = backgroundGalleryPreviewStyles[option.id] ?? backgroundGalleryPreviewStyles["minimal-white"];
  return (
    <span className="relative block h-24 overflow-hidden rounded-[1.15rem] border border-[#E2E8F0]" style={{ background: style.background }}>
      <span className="absolute inset-0 opacity-80" style={{ backgroundImage: style.pattern }} />
      <span className="absolute left-3 top-3 h-7 w-7 rounded-full border border-white/70 bg-white/80 shadow-sm" />
      <span className="absolute bottom-3 left-3 right-3 grid gap-2">
        <span className="h-2 w-24 rounded-full bg-white/80 shadow-sm" />
        <span className="h-2 w-16 rounded-full bg-white/60 shadow-sm" />
      </span>
      <span className="absolute right-3 top-3 h-8 w-12 rounded-full border border-white/70 bg-white/35 backdrop-blur" />
    </span>
  );
}
