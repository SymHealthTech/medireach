import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteJsonLd } from "@/lib/seo/profile";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * Fonts (DESIGN_BRIEF.md §2): Fraunces for display, Plus Jakarta Sans for UI
 * and body, Noto Sans Devanagari reserved for Hindi/Marathi.
 *
 * Self-hosted from src/assets/fonts (variable woff2 files from Google Fonts,
 * SIL OFL) so builds never depend on fetching fonts.googleapis.com. Each
 * family is split like Google serves it: a preloaded latin file plus a
 * latin-ext file (₹ and accented letters) limited by unicode-range, so the
 * browser only downloads it when the page uses those characters.
 * (next/font needs the values written inline.) globals.css combines the pair into --font-fraunces / --font-jakarta.
 */
const fraunces = localFont({
  src: "../assets/fonts/fraunces-latin-wght.woff2",
  weight: "500 700",
  variable: "--font-fraunces-latin",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const frauncesExt = localFont({
  src: "../assets/fonts/fraunces-latin-ext-wght.woff2",
  weight: "500 700",
  variable: "--font-fraunces-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

const jakarta = localFont({
  src: "../assets/fonts/plus-jakarta-sans-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-jakarta-latin",
  display: "swap",
});

const jakartaExt = localFont({
  src: "../assets/fonts/plus-jakarta-sans-latin-ext-wght.woff2",
  weight: "400 700",
  variable: "--font-jakarta-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

const devanagari = localFont({
  src: "../assets/fonts/noto-sans-devanagari-devanagari-wght.woff2",
  weight: "400 600",
  variable: "--font-noto-devanagari",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A" }],
});

const fontVariables = [fraunces, frauncesExt, jakarta, jakartaExt, devanagari].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} – Websites and digital visiting cards for doctors`,
  description: "A professional one-page website and digital visiting card for doctors in India.",
  applicationName: SITE_NAME,
  // Static icons in public/ (favicon.ico is picked up from /favicon.ico by browsers too).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
  openGraph: { siteName: SITE_NAME, locale: "en_IN", type: "website" },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#0A3F3F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={fontVariables}>
      <body className="min-h-full font-sans antialiased">
        <JsonLd data={siteJsonLd()} />
        {children}
      </body>
    </html>
  );
}
