/**
 * Cnaz Foods design tokens for the mobile app — the same palette and type
 * scale as the website's tailwind.config.ts. `brand600` is the primary action
 * colour (Add to Cart, Checkout, active nav) and is dark enough for white
 * text (WCAG AA). `accent` red is reserved for errors; `gold` for small
 * highlights on dark surfaces.
 */
export const colors = {
  brand: {
    50: "#F4FAEC",
    100: "#E6F4D4",
    200: "#CDE8A9",
    300: "#AED876",
    400: "#8FC74A",
    500: "#6FAD2B",
    600: "#4A811C",
    700: "#3C6A18",
    800: "#335718",
    900: "#2B4716",
  },
  accent: {
    DEFAULT: "#B3261E",
    dark: "#8C1D17",
    soft: "#FBEAE8",
  },
  gold: {
    DEFAULT: "#F2C230",
    soft: "#FDF3D3",
  },
  ink: {
    50: "#F7F8F5",
    100: "#F0F1EC",
    200: "#E3E5DF",
    300: "#C9CDC4",
    500: "#6B7464",
    600: "#55604D",
    700: "#3A4632",
    800: "#27331C",
    900: "#16210F",
    950: "#0B0F08",
  },
  cream: {
    50: "#FBF9F4",
    100: "#F6F3EA",
  },
  white: "#FFFFFF",
} as const;

/** Typography — Sora for display, Inter for body (same pairing as the site). */
export const fonts = {
  display: "Sora_600SemiBold",
  displayBold: "Sora_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Soft card shadow (mirrors the website's `shadow-soft`). */
export const shadowSoft = {
  shadowColor: "#101808",
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

export const shadowLift = {
  shadowColor: "#101808",
  shadowOpacity: 0.16,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
} as const;
