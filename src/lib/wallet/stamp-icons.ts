/**
 * The stamp icons a business can choose from.
 *
 * The artwork is Microsoft's Fluent Emoji in its 3D style (MIT licence,
 * https://github.com/microsoft/fluentui-emoji, via @lobehub/fluent-emoji-3d;
 * see public/stamp-icons/3d/LICENSE.txt). The same pictures are used on the
 * web card, in Design Studio and in the Apple and Google Wallet stamp picture,
 * so every customer sees the same icon whatever phone they hold.
 *
 * The browser loads each icon from /stamp-icons/3d/<file>.webp. The wallet
 * picture is rendered on the server, which embeds a PNG copy of the same icon
 * (stamp-icon-art.ts) because the renderer cannot fetch files.
 */
export type StampIcon = { emoji: string; label: string; file: string };

export const STAMP_ICONS: StampIcon[] = [
  {
    "emoji": "☕",
    "label": "Coffee",
    "file": "2615"
  },
  {
    "emoji": "🍵",
    "label": "Tea",
    "file": "1f375"
  },
  {
    "emoji": "🚗",
    "label": "Car",
    "file": "1f697"
  },
  {
    "emoji": "🪣",
    "label": "Bucket & wash",
    "file": "1faa3"
  },
  {
    "emoji": "✂️",
    "label": "Scissors",
    "file": "2702-fe0f"
  },
  {
    "emoji": "💈",
    "label": "Barber pole",
    "file": "1f488"
  },
  {
    "emoji": "🍕",
    "label": "Pizza",
    "file": "1f355"
  },
  {
    "emoji": "🍔",
    "label": "Burger",
    "file": "1f354"
  },
  {
    "emoji": "🍦",
    "label": "Ice cream",
    "file": "1f366"
  },
  {
    "emoji": "🥗",
    "label": "Salad",
    "file": "1f957"
  },
  {
    "emoji": "💅",
    "label": "Nails",
    "file": "1f485"
  },
  {
    "emoji": "💪",
    "label": "Gym",
    "file": "1f4aa"
  },
  {
    "emoji": "💐",
    "label": "Flowers",
    "file": "1f490"
  },
  {
    "emoji": "🐕",
    "label": "Pet",
    "file": "1f415"
  },
  {
    "emoji": "👕",
    "label": "Laundry",
    "file": "1f455"
  },
  {
    "emoji": "🧴",
    "label": "Beauty",
    "file": "1f9f4"
  },
  {
    "emoji": "⭐",
    "label": "Star",
    "file": "2b50"
  },
  {
    "emoji": "❤️",
    "label": "Heart",
    "file": "2764-fe0f"
  },
  {
    "emoji": "🎁",
    "label": "Gift",
    "file": "1f381"
  },
  {
    "emoji": "✅",
    "label": "Tick",
    "file": "2705"
  },
  {
    "emoji": "🔵",
    "label": "Circle",
    "file": "1f535"
  },
  {
    "emoji": "💎",
    "label": "Diamond",
    "file": "1f48e"
  },
  {
    "emoji": "🏆",
    "label": "Trophy",
    "file": "1f3c6"
  },
  {
    "emoji": "👑",
    "label": "Crown",
    "file": "1f451"
  },
  {
    "emoji": "👍",
    "label": "Thumbs up",
    "file": "1f44d"
  },
  {
    "emoji": "🔥",
    "label": "Flame",
    "file": "1f525"
  },
  {
    "emoji": "🪒",
    "label": "Razor",
    "file": "1fa92"
  },
  {
    "emoji": "💇",
    "label": "Comb",
    "file": "1f487"
  },
  {
    "emoji": "🫘",
    "label": "Coffee bean",
    "file": "1fad8"
  },
  {
    "emoji": "🥐",
    "label": "Croissant",
    "file": "1f950"
  },
  {
    "emoji": "🍪",
    "label": "Cookie",
    "file": "1f36a"
  },
  {
    "emoji": "🍽️",
    "label": "Plate",
    "file": "1f37d-fe0f"
  },
  {
    "emoji": "🧑‍🍳",
    "label": "Chef hat",
    "file": "1f9d1-200d-1f373"
  },
  {
    "emoji": "🥪",
    "label": "Sandwich",
    "file": "1f96a"
  },
  {
    "emoji": "🍰",
    "label": "Cake",
    "file": "1f370"
  },
  {
    "emoji": "💧",
    "label": "Water drop",
    "file": "1f4a7"
  },
  {
    "emoji": "✨",
    "label": "Bubbles",
    "file": "2728"
  },
  {
    "emoji": "🛞",
    "label": "Wheel",
    "file": "1f6de"
  },
  {
    "emoji": "💦",
    "label": "Spray",
    "file": "1f4a6"
  },
  {
    "emoji": "💄",
    "label": "Lipstick",
    "file": "1f484"
  },
  {
    "emoji": "🪞",
    "label": "Mirror",
    "file": "1fa9e"
  },
  {
    "emoji": "🖌️",
    "label": "Makeup brush",
    "file": "1f58c-fe0f"
  },
  {
    "emoji": "🌷",
    "label": "Tulip",
    "file": "1f337"
  },
  {
    "emoji": "🌹",
    "label": "Rose",
    "file": "1f339"
  },
  {
    "emoji": "🪷",
    "label": "Water lily",
    "file": "1fab7"
  },
  {
    "emoji": "🌺",
    "label": "Hibiscus",
    "file": "1f33a"
  },
  {
    "emoji": "🌸",
    "label": "Cherry blossom",
    "file": "1f338"
  },
  {
    "emoji": "🌻",
    "label": "Sunflower",
    "file": "1f33b"
  },
  {
    "emoji": "🌼",
    "label": "Daisy",
    "file": "1f33c"
  },
  {
    "emoji": "🪻",
    "label": "Hyacinth",
    "file": "1fabb"
  }
];

/** Where the browser loads an icon's artwork from. */
export function stampIconUrl(icon: StampIcon): string {
  return `/stamp-icons/3d/${icon.file}.webp`;
}

export const DEFAULT_STAMP_EMOJI = "\u2705";

export function findStampIcon(emoji: string | null | undefined): StampIcon {
  const wanted = emoji?.trim();
  return (
    STAMP_ICONS.find((icon) => icon.emoji === wanted) ??
    STAMP_ICONS.find((icon) => icon.emoji === DEFAULT_STAMP_EMOJI)!
  );
}
