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
        action: {
          DEFAULT: "rgb(var(--brand-amber) / <alpha-value>)",
          hover: "rgb(var(--brand-amber-hover) / <alpha-value>)",
        },
        sos: "rgb(var(--brand-sos) / <alpha-value>)",
        success: "rgb(var(--brand-success) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-subtle": "rgb(var(--ink-subtle) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        input: "rgb(var(--input-border) / <alpha-value>)",
      },
      borderRadius: {
        lg: "0.5rem",   // 8px — inputs, small controls
        xl: "0.75rem",  // 12px — cards, buttons
        "2xl": "1rem",  // 16px — modals / large surfaces
      },
      boxShadow: {
        // Soft, low-contrast card elevation (build-prompt: soft shadow, no
        // harsh borders). Dark variant is applied per-component via dark:shadow.
        card: "0 1px 3px rgba(0,0,0,0.08)",
        "card-dark": "0 1px 3px rgba(0,0,0,0.2)",
        fab: "0 6px 16px rgba(230,57,70,0.35)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
