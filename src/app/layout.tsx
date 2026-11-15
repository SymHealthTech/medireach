import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Inter is the app's typeface (build-prompt typography spec). Loaded via
 * next/font so it self-hosts (no external request at runtime) and exposes a
 * `--font-sans` CSS variable that Tailwind's `font-sans` family resolves to.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Root layout. The inline theme script applies the persisted dark/light choice
 * before first paint to avoid a flash.
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "MediReach — Websites and digital visiting cards for doctors",
  description:
    "A professional one-page website and digital visiting card for doctors in India.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  applicationName: "MediReach",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E3B3C" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('mr-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
