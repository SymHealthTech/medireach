import { absUrl } from "@/lib/site";
import { Icon, type ICONS } from "@/templates/card/parts";
import { CARD_SIZE, type PublicDoctor, type PublicEstablishment } from "@/templates/types";

/**
 * One-tap buttons on the cards: Call, WhatsApp, Directions, Save contact and
 * Website. Every design draws them in its own colours, in a row of tiles (the
 * "dock") at a FIXED place on the phone card (1080 × 1920, `PHONE_DOCK`, on
 * the bottom edge of the header, above the contact details) and
 * on the print card (1004 × 650, `PRINT_DOCK`, smaller tiles), so:
 *
 *  - on the card page (HTML) they are real links;
 *  - in the PNG they are part of the picture;
 *  - in the PDF, lib/cards/render.tsx puts a clickable link over each tile
 *    using the same geometry (`dockSlots`), so the buttons work there too.
 *
 * Satori-safe: absolute positions, flexbox, inline <svg> only.
 */

export type CardActionKey = "call" | "emergency" | "whatsapp" | "directions" | "save" | "website";

export interface CardAction {
  key: CardActionKey;
  label: string;
  /** Absolute URL (tel:, https:). */
  href: string;
  icon: keyof typeof ICONS;
}

/** Where the dock sits on the phone card, in card pixels. */
export interface CardDock {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Space between tiles. */
  gap: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Colours and shape of a design's buttons. */
export interface DockStyle {
  /** The first button (Call), filled. */
  primaryBg: string;
  primaryText: string;
  /** The other buttons. */
  tileBg: string;
  tileText: string;
  iconColor: string;
  /** Optional tile border, e.g. "2px solid #E2E5EC". */
  border?: string;
  radius: number;
  font: string;
  uppercase?: boolean;
  shadow?: string;
}

export const DOCK_HEIGHT = 150;

/**
 * The phone dock straddling the bottom edge of a header `header` px tall:
 * the buttons come first, right under the name, above the contact details.
 */
export function dockOnHeader(header: number, margin = 64): CardDock {
  const { width } = CARD_SIZE.phone;
  return { x: margin, y: header - DOCK_HEIGHT / 2, width: width - margin * 2, height: DOCK_HEIGHT, gap: 16 };
}

/** Space from the header's bottom edge to the content under a `dockOnHeader` dock (its lower half plus a clear gap). */
export const BELOW_DOCK = DOCK_HEIGHT / 2 + 44;

/** Tile height on the print card. */
export const PRINT_DOCK_HEIGHT = 64;

/** A print card dock: a row of small tiles from `x` to `right`, at `y` (in the card's free band between the name and the contact rows). */
export function printDock(x: number, right: number, y: number): CardDock {
  return { x, y, width: right - x, height: PRINT_DOCK_HEIGHT, gap: 10 };
}

/** The phone and print docks of one card design. */
export interface CardDocks {
  phone: CardDock;
  print: CardDock;
}

/** Each tile's rectangle (card pixels). Shared by the drawing and the PDF links. */
export function dockSlots(dock: CardDock, n: number): Rect[] {
  if (n <= 0) return [];
  const w = Math.floor((dock.width - dock.gap * (n - 1)) / n);
  return Array.from({ length: n }, (_, i) => ({ x: dock.x + i * (w + dock.gap), y: dock.y, width: w, height: dock.height }));
}

/** Label size that fits a tile (uppercase is wider). */
const labelSize = (label: string, upper?: boolean, small?: boolean) =>
  small ? (upper ? (label.length > 8 ? 12 : 13) : label.length > 8 ? 14 : 15) : upper ? (label.length > 8 ? 21 : 23) : label.length > 8 ? 25 : 27;

const abs = (url: string) => (url.startsWith("/") ? absUrl(url) : url);
const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

/** A doctor's buttons: Call, WhatsApp, Directions (first clinic), Save contact, Website. */
export function doctorCardActions(d: PublicDoctor): CardAction[] {
  const phone = d.phone ?? d.clinics[0]?.phone;
  const clinic = d.clinics[0];
  return [
    ...(phone ? [{ key: "call" as const, label: "Call", href: `tel:+${phone}`, icon: "phone" as const }] : []),
    ...(d.whatsapp ? [{ key: "whatsapp" as const, label: "WhatsApp", href: waLink(d.whatsapp, `Hello ${d.fullName}, I got your visiting card.`), icon: "chat" as const }] : []),
    ...(clinic ? [{ key: "directions" as const, label: "Directions", href: clinic.directionsUrl, icon: "nav" as const }] : []),
    { key: "save", label: "Save", href: abs(d.vcfUrl), icon: "userPlus" },
    { key: "website", label: "Website", href: d.shareUrl, icon: "globe" },
  ];
}

/** A clinic's or hospital's buttons: Call, Emergency (hospitals that list one), WhatsApp, Directions, Website. */
export function siteCardActions(s: PublicEstablishment): CardAction[] {
  const phone = s.phones[0];
  return [
    ...(phone ? [{ key: "call" as const, label: "Call", href: `tel:+${phone}`, icon: "phone" as const }] : []),
    ...(s.emergencyPhone && s.emergencyPhone !== phone ? [{ key: "emergency" as const, label: "Emergency", href: `tel:+${s.emergencyPhone}`, icon: "alert" as const }] : []),
    ...(s.whatsapp ? [{ key: "whatsapp" as const, label: "WhatsApp", href: waLink(s.whatsapp, `Hello ${s.name}, I got your visiting card.`), icon: "chat" as const }] : []),
    { key: "directions", label: "Directions", href: s.directionsUrl, icon: "nav" },
    { key: "website", label: "Website", href: s.shareUrl, icon: "globe" },
  ];
}

/**
 * The row of buttons, drawn at `dock` (a direct child of the card's root, which
 * is position: relative). `links` makes them real links (card page only).
 * No fragments: Satori draws nothing for a component that returns one.
 */
export function ActionDock({ actions, dock, style: st, links, small }: { actions: CardAction[]; dock: CardDock; style: DockStyle; links?: boolean; small?: boolean }) {
  const slots = dockSlots(dock, actions.length);
  // The print card's tiles are small: no shadow, smaller icon and label, tighter corners.
  const radius = small ? Math.round(st.radius * 0.4) : st.radius;
  return (
    <div style={{ display: "flex", position: "absolute", left: dock.x, top: dock.y, width: dock.width, height: dock.height }}>
      {actions.map((a, i) => {
        const r = slots[i]!;
        const primary = i === 0;
        const color = primary ? st.primaryText : st.tileText;
        const box = {
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          position: "absolute" as const,
          left: r.x - dock.x,
          top: r.y - dock.y,
          width: r.width,
          height: r.height,
          borderRadius: radius,
          background: primary ? st.primaryBg : st.tileBg,
          ...(st.border && !primary ? { border: st.border } : {}),
          ...(st.shadow && !small ? { boxShadow: st.shadow } : {}),
          color,
          fontFamily: st.font,
          textDecoration: "none",
        };
        const children = [
          <Icon key="icon" name={a.icon} size={small ? 24 : 52} color={primary ? st.primaryText : st.iconColor} />,
          <div key="label" style={{ display: "flex", marginTop: small ? 5 : 14, fontSize: labelSize(a.label, st.uppercase, small), fontWeight: 700, letterSpacing: st.uppercase ? (small ? 0.5 : 1) : 0, color }}>
            {st.uppercase ? a.label.toUpperCase() : a.label}
          </div>,
        ];
        return links ? (
          <a
            key={a.key}
            href={a.href}
            aria-label={a.key === "save" ? "Save contact" : a.label}
            {...(a.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
            {...(a.key === "save" ? { download: "" } : {})}
            style={box}
          >
            {children}
          </a>
        ) : (
          <div key={a.key} style={box}>
            {children}
          </div>
        );
      })}
    </div>
  );
}
