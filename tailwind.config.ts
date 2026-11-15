import type { Config } from "tailwindcss";

/**
 * Tailwind theme wired to the DESIGN_BRIEF.md tokens in globals.css.
 *
 * The legacy aliases at the bottom (brand, action, sos, success, ink-muted,
 * surface-raised, input) keep the older UI primitives in src/components/ui
 * rendering on the new palette until they're replaced in Phase 3.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: token("ink"), 700: token("ink-700") },
        "on-ink": token("on-ink"),
        paper: token("paper"),
        surface: token("surface"),
        marigold: token("marigold"),
        sage: token("sage"),
        clay: token("clay"),
        leaf: token("leaf"),
        body: token("body"),
        muted: token("muted"),
        line: token("line"),

        // Legacy aliases (pre-portfolio UI primitives).
        brand: { DEFAULT: token("ink"), fg: token("on-ink") },
        action: { DEFAULT: token("marigold"), hover: token("marigold") },
        sos: token("clay"),
        success: token("leaf"),
        "surface-raised": token("surface"),
        "ink-subtle": token("muted"),
        "ink-muted": token("muted"),
        input: token("line"),
      },
      borderRadius: {
        lg: "10px", // inputs, buttons
        xl: "12px", // cards
        "2xl": "16px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(14,59,60,.06), 0 8px 24px rgba(14,59,60,.06)",
        card: "0 1px 2px rgba(14,59,60,.06), 0 8px 24px rgba(14,59,60,.06)",
        "card-dark": "0 1px 3px rgba(0,0,0,0.2)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-devanagari)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      maxWidth: {
        content: "1160px",
      },
    },
  },
  plugins: [],
};

export default config;
