import type { Config } from "tailwindcss";

/**
 * Cnaz Foods design system.
 *
 * `brand` is the green taken from the Cnaz Foods logo (bright lime → deep
 * green gradient). `brand.600` is the primary action colour and is dark
 * enough for white text (WCAG AA). `accent` (red) and `gold` are the small
 * supporting colours from the product packaging, used sparingly.
 * `ink` are warm, green-tinted neutrals; `cream` are the page surfaces.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          "var(--font-sora)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 8, 0.05), 0 12px 32px -16px rgba(16, 24, 8, 0.22)",
        lift: "0 2px 4px rgba(16, 24, 8, 0.06), 0 24px 48px -24px rgba(16, 24, 8, 0.28)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
