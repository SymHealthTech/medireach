import { NextResponse } from "next/server";

/**
 * Web app manifest (spec §3.2 — installable PWA). Served from a route so it can
 * stay in sync with brand tokens without a separate static file step. Icons are
 * generated from the brand badge (see /icon route).
 */
export function GET() {
  return NextResponse.json({
    name: "MediReach",
    short_name: "MediReach",
    description: "Voice-first clinic management for solo GPs.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F9FA",
    theme_color: "#0E7C7B",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  });
}
