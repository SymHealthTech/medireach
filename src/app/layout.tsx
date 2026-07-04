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
 * before first paint to avoid a flash (spec §2 dark/light support). The web app
 * manifest + theme color make the app installable as a PWA (spec §3.2).
 */

export const metadata: Metadata = {
  title: "MediReach — Voice-first clinic management",
  description:
    "Write prescriptions by speaking. A voice-first clinic management app for solo GPs and small clinics in India.",
  manifest: "/manifest.webmanifest",
  applicationName: "MediReach",
  appleWebApp: { capable: true, title: "MediReach", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E7C7B" },
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
