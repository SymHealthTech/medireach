import { Icon, type ICONS } from "@/templates/card/parts";
import { CARD_SIZE, type PublicDoctor, type PublicEstablishment } from "@/templates/types";

/**
 * One-tap buttons on the cards: Call, WhatsApp, Directions and Website
 * (hospitals: also Emergency). Every design draws them in its own colours as
 * one rounded box split into icon + label cells (like the card on the home
 * page), the "dock", at a FIXED place on the phone card (1080 × 1920,
 * `PHONE_DOCK`, on the bottom edge of the header, above the contact details)
 * and on the print card (1004 × 650, `PRINT_DOCK`, a smaller box), so:
 *
 *  - on the card page (HTML) they are real links;
 *  - in the PNG they are part of the picture;
 *  - in the PDF, lib/cards/render.tsx puts a clickable link over each cell
 *    using the same geometry (`dockSlots`), so the buttons work there too.
 *
 * Satori-safe: absolute positions, flexbox, inline <svg> only.
 */

export type CardActionKey = "call" | "emergency" | "whatsapp" | "directions" | "website";

export interface CardAction {
  key: CardActionKey;
  label: string;
  /** Absolute URL (tel:, https:). */
  href: string;
  icon: keyof typeof ICONS;
}

/** Where the dock (the box) sits on a card, in card pixels. */
export interface CardDock {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Inner padding of the box. */
  pad: number;
  /** Space between cells. */
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
  /**
   * The box behind all the buttons (Call included: the box straddles the
   * header's edge, where a filled button would blend into the header).
   */
  tileBg: string;
  tileText: string;
  iconColor: string;
  /** Optional box border, e.g. "2px solid #E2E5EC". */
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
  return { x: margin, y: header - DOCK_HEIGHT / 2, width: width - margin * 2, height: DOCK_HEIGHT, pad: 16, gap: 8 };
}

/** Space from the header's bottom edge to the content under a `dockOnHeader` dock (its lower half plus a clear gap). */
export const BELOW_DOCK = DOCK_HEIGHT / 2 + 44;

/** Box height on the print card. */
export const PRINT_DOCK_HEIGHT = 64;

/** A print card dock: a small box from `x` to `right`, at `y` (in the card's free band between the name and the contact rows). */
export function printDock(x: number, right: number, y: number): CardDock {
  return { x, y, width: right - x, height: PRINT_DOCK_HEIGHT, pad: 5, gap: 4 };
}

/** The phone and print docks of one card design. */
export interface CardDocks {
  phone: CardDock;
  print: CardDock;
}

/** Each button cell's rectangle inside the box (card pixels). Shared by the drawing and the PDF links. */
export function dockSlots(dock: CardDock, n: number): Rect[] {
  if (n <= 0) return [];
  const inner = dock.width - dock.pad * 2;
  const w = Math.floor((inner - dock.gap * (n - 1)) / n);
  return Array.from({ length: n }, (_, i) => ({ x: dock.x + dock.pad + i * (w + dock.gap), y: dock.y + dock.pad, width: w, height: dock.height - dock.pad * 2 }));
}

/** WhatsApp's icon is green on every card, as on the home page card. */
const WHATSAPP_GREEN = "#1C7442";

/** Label size that fits a tile (uppercase is wider). */
const labelSize = (label: string, upper?: boolean, small?: boolean) =>
  small ? (upper ? (label.length > 8 ? 12 : 13) : label.length > 8 ? 14 : 15) : upper ? (label.length > 8 ? 21 : 23) : label.length > 8 ? 25 : 27;

const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

/** A doctor's buttons: Call, WhatsApp, Directions (first clinic), Website. Four at most: five tiles looked crowded. */
export function doctorCardActions(d: PublicDoctor): CardAction[] {
  const phone = d.phone ?? d.clinics[0]?.phone;
  const clinic = d.clinics[0];
  return [
    ...(phone ? [{ key: "call" as const, label: "Call", href: `tel:+${phone}`, icon: "phone" as const }] : []),
    ...(d.whatsapp ? [{ key: "whatsapp" as const, label: "WhatsApp", href: waLink(d.whatsapp, `Hello ${d.fullName}, I got your visiting card.`), icon: "chat" as const }] : []),
    ...(clinic ? [{ key: "directions" as const, label: "Directions", href: clinic.directionsUrl, icon: "nav" as const }] : []),
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
 * The buttons: one box with a cell per button, drawn at `dock` (a direct child
 * of the card's root, which is position: relative). `links` makes the cells
 * real links (card page only).
 * No fragments: Satori draws nothing for a component that returns one.
 */
export function ActionDock({ actions, dock, style: st, links, small }: { actions: CardAction[]; dock: CardDock; style: DockStyle; links?: boolean; small?: boolean }) {
  const slots = dockSlots(dock, actions.length);
  // The print card's box is small: no shadow, smaller icon and label, tighter corners.
  const radius = small ? Math.round(st.radius * 0.4) : st.radius;
  const color = st.tileText;
  // The box is its own layer (cells are positioned against the dock, not inside a border).
  const box = (
    <div
      key="box"
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: dock.width,
        height: dock.height,
        borderRadius: radius,
        background: st.tileBg,
        boxSizing: "border-box",
        ...(st.border ? { border: st.border } : {}),
        ...(st.shadow && !small ? { boxShadow: st.shadow } : {}),
      }}
    />
  );
  const cells = actions.map((a, i) => {
    const r = slots[i]!;
    const cell = {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      position: "absolute" as const,
      left: r.x - dock.x,
      top: r.y - dock.y,
      width: r.width,
      height: r.height,
      borderRadius: Math.max(0, radius - dock.pad),
      color,
      fontFamily: st.font,
      textDecoration: "none",
    };
    const children = [
      <Icon key="icon" name={a.icon} size={small ? 24 : 50} color={a.key === "whatsapp" ? WHATSAPP_GREEN : st.iconColor} />,
      <div key="label" style={{ display: "flex", marginTop: small ? 4 : 12, fontSize: labelSize(a.label, st.uppercase, small), fontWeight: 700, letterSpacing: st.uppercase ? (small ? 0.5 : 1) : 0, color }}>
        {st.uppercase ? a.label.toUpperCase() : a.label}
      </div>,
    ];
    return links ? (
      <a key={a.key} href={a.href} aria-label={a.label} {...(a.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})} style={cell}>
        {children}
      </a>
    ) : (
      <div key={a.key} style={cell}>
        {children}
      </div>
    );
  });
  return <div style={{ display: "flex", position: "absolute", left: dock.x, top: dock.y, width: dock.width, height: dock.height }}>{[box, ...cells]}</div>;
}
