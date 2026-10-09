import type { CardDesignStampIcon } from "@/lib/card-design";
import { getStampEmoji, stampEmojiMarks } from "@/lib/stamp-icon-marks";
import { findStampIcon, stampIconUrl } from "@/lib/wallet/stamp-icons";

// Re-exported so existing imports keep working; the map lives in the shared lib.
export { getStampEmoji, stampEmojiMarks };

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
  // The same 3D artwork as the wallet stamp picture, not the phone's emoji
  // font, so the web card and the wallet card match exactly.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={stampIconUrl(findStampIcon(getStampEmoji(stampIcon)))}
      alt=""
      title={getStampAriaLabel(stampIcon)}
      className={`inline-block object-contain ${className}`}
      draggable={false}
    />
  );
}
