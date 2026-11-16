import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteJsonLd } from "@/lib/seo/profile";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * Fonts (DESIGN_BRIEF.md §2): Fraunces for display, Plus Jakarta Sans for UI
 * and body, Noto Sans Devanagari reserved for Hindi/Marathi. Self-hosted via
 * next/font; globals.css maps these variables to `font-display` / `font-sans`.
 */
const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-noto-devanagari",
  display: "swap",
  preload: false,
});

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
  themeColor: "#0E3B3C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable} ${devanagari.variable}`}>
      <body className="min-h-full font-sans antialiased">
        <JsonLd data={siteJsonLd()} />
        {children}
      </body>
    </html>
  );
}
