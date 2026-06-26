export const designTokens = {
  colors: {
    brand: {
      primary: "#F97316",
      dark: "#EA580C",
      soft: "#FFF7ED",
      text: "#1E293B",
      background: "#FFFFFF",
    },
    semantic: {
      success: { text: "#047857", bg: "#ECFDF5", border: "#A7F3D0" },
      warning: { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
      danger: { text: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
      info: { text: "#0369A1", bg: "#F0F9FF", border: "#BAE6FD" },
      neutral: { text: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "2rem",
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  shadow: {
    sm: "0 1px 2px rgb(15 23 42 / 0.06)",
    md: "0 8px 24px rgb(15 23 42 / 0.08)",
    lg: "0 20px 45px rgb(15 23 42 / 0.12)",
  },
  typography: {
    label: "text-xs font-semibold uppercase tracking-wide",
    body: "text-sm leading-6",
    cardTitle: "text-base font-semibold",
    sectionTitle: "text-lg font-semibold",
    pageTitle: "text-2xl font-bold md:text-3xl",
  },
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2",
  transitions: {
    fast: "duration-150",
    normal: "duration-200",
    slow: "duration-300",
  },
  zIndex: {
    dropdown: 30,
    sticky: 40,
    drawer: 50,
    modal: 60,
    toast: 70,
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
} as const;

export type DesignTokens = typeof designTokens;
