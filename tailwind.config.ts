import type { Config } from "tailwindcss";

/**
 * MediReach brand palette (spec §2 / build-prompt design direction).
 * Colors are wired through CSS variables (see globals.css) so dark mode
 * swaps the teal/background/text values without changing class names.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Resolved at runtime from CSS variables so the same token works in
        // light and dark mode.
        brand: {
          DEFAULT: "rgb(var(--brand-teal) / <alpha-value>)",
          fg: "rgb(var(--brand-teal-fg) / <alpha-value>)",
        },
        action: "rgb(var(--brand-amber) / <alpha-value>)",
        sos: "rgb(var(--brand-sos) / <alpha-value>)",
        success: "rgb(var(--brand-success) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
