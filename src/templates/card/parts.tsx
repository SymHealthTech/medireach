import type { CardQr } from "@/templates/types";

/** Pieces shared by every card design (Satori-safe: inline styles, flexbox, inline <svg>). */

// Lucide-style 24px icon paths (stroke only).
export const ICONS = {
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM19 8v6M22 11h-6",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 6v6l4 2",
  globe: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  nav: "M3 11l19-9-9 19-2-8-8-2z",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
} as const;

export function Icon({ name, size, color }: { name: keyof typeof ICONS; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function QrBlock({ qr, px, radius = 16, color = "#0A3F3F" }: { qr: CardQr; px: number; radius?: number; color?: string }) {
  const quiet = 2.5;
  return (
    <div style={{ display: "flex", background: "#FFFFFF", padding: Math.round((px / (qr.size + quiet * 2)) * quiet), borderRadius: radius }}>
      <svg width={px} height={px} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges">
        <path d={qr.path} fill={color} />
      </svg>
    </div>
  );
}

export const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

/** Shortened to `max` characters with "…" (card rows have a fixed width). */
export const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** "#0A3F3F" → "rgba(10,63,63,0.14)" (for decorative glows; Satori-safe). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
