/**
 * Visiting card colour styles, each with a code name (e.g. "DOC-LAGOON").
 *
 * Doctors, clinics and hospitals pick a style on the public /visiting-cards
 * page and tell us its code with their website request. In the dashboard the
 * code is set on the doctor page or clinic/hospital site (`cardStyle`), and
 * every version of that card (card page, WhatsApp image, print PDF) uses it.
 *
 * Plain module: used by card templates (HTML + Satori), the dashboard pickers
 * and zod schemas. Changing a code breaks the link for anyone already using
 * it, so add new styles instead of renaming.
 */

export const CARD_STYLE_GROUPS = ["doctor", "clinic", "hospital"] as const;
export type CardStyleGroup = (typeof CARD_STYLE_GROUPS)[number];

/** Colours of the doctor card (photo layout). */
export interface DoctorCardPalette {
  /** Header / side panel gradient: light → mid → deep. `mid` is the flat colour. */
  panel: [string, string, string];
  /** On the panel: photo ring, "Digital visiting card" label, specialty. */
  highlight: string;
  /** On paper: the short bar under the name, and the bottom stripe (to `accent2`). */
  accent: string;
  accent2: string;
  /** Name and icons on paper, QR code. */
  ink: string;
  /** Specialty and website on paper. */
  brand: string;
  /** Icon bubbles and photo background. */
  soft: string;
  paper: string;
}

/** Colours of the clinic / hospital card (logo layout); same shape as a specialty theme palette. */
export interface SiteCardPalette {
  /** Panel and header colour, name on paper, QR code. White text sits on it. */
  primary: string;
  /** On the panel: label and category; on paper: the bar under the name and the bottom stripe. */
  accent: string;
  /** Icon bubbles and the logo placeholder. */
  soft: string;
}

interface StyleBase {
  code: string;
  name: string;
  /** One line for the gallery: "Deep teal with amber accents". */
  colours: string;
  /** Three swatches shown next to the code. */
  swatches: [string, string, string];
}

export interface DoctorCardStyle extends StyleBase {
  group: "doctor";
  palette: DoctorCardPalette;
}

export interface SiteCardStyle extends StyleBase {
  group: "clinic" | "hospital";
  palette: SiteCardPalette;
}

export type CardStyle = DoctorCardStyle | SiteCardStyle;

const doctor = (code: string, name: string, colours: string, palette: DoctorCardPalette): DoctorCardStyle => ({
  group: "doctor",
  code,
  name,
  colours,
  palette,
  swatches: [palette.panel[1], palette.highlight, palette.soft],
});

const site = (group: "clinic" | "hospital", code: string, name: string, colours: string, palette: SiteCardPalette): SiteCardStyle => ({
  group,
  code,
  name,
  colours,
  palette,
  swatches: [palette.primary, palette.accent, palette.soft],
});

export const DOCTOR_CARD_STYLES: readonly DoctorCardStyle[] = [
  doctor("DOC-LAGOON", "Lagoon", "Deep teal with amber accents", {
    panel: ["#0e5655", "#0A3F3F", "#062A2A"],
    highlight: "#F2994A",
    accent: "#F2994A",
    accent2: "#F0C46F",
    ink: "#0A3F3F",
    brand: "#0E7C7B",
    soft: "#E0F2F1",
    paper: "#F7F9FA",
  }),
  doctor("DOC-AMBER", "Amber", "Warm amber with teal accents", {
    panel: ["#E8893A", "#C9661E", "#9A4710"],
    highlight: "#0A3F3F",
    accent: "#0E7C7B",
    accent2: "#F2994A",
    ink: "#6B3410",
    brand: "#0E7C7B",
    soft: "#FDEBD9",
    paper: "#FFFBF6",
  }),
  doctor("DOC-SAPPHIRE", "Sapphire", "Navy blue with gold accents", {
    panel: ["#2A4C8A", "#17305E", "#0C1C3D"],
    highlight: "#F2C14E",
    accent: "#F2C14E",
    accent2: "#F7DC8F",
    ink: "#17305E",
    brand: "#2F5DA8",
    soft: "#E6EDF8",
    paper: "#F7F9FC",
  }),
  doctor("DOC-PLUM", "Plum", "Plum with soft rose accents", {
    panel: ["#74407A", "#55275A", "#38163C"],
    highlight: "#F6A8BC",
    accent: "#E0789A",
    accent2: "#F6C3D1",
    ink: "#55275A",
    brand: "#8E3F84",
    soft: "#F5E8F3",
    paper: "#FCF8FB",
  }),
  doctor("DOC-FOREST", "Forest", "Forest green with mint accents", {
    panel: ["#2F6B4A", "#1F4D35", "#123322"],
    highlight: "#A8E6C3",
    accent: "#3FA56F",
    accent2: "#A8E6C3",
    ink: "#1F4D35",
    brand: "#2F7A52",
    soft: "#E3F2EA",
    paper: "#F7FAF8",
  }),
];

export const CLINIC_CARD_STYLES: readonly SiteCardStyle[] = [
  site("clinic", "CLN-TEAL", "Teal", "Teal with amber accents", { primary: "#0E7C7B", accent: "#F2994A", soft: "#E0F2F1" }),
  site("clinic", "CLN-AMBER", "Amber", "Amber with light teal accents", { primary: "#C9661E", accent: "#8EE3DF", soft: "#FDEBD9" }),
  site("clinic", "CLN-OCEAN", "Ocean", "Ocean blue with sky accents", { primary: "#1D6FB8", accent: "#9EDCF2", soft: "#E3F0FB" }),
  site("clinic", "CLN-BERRY", "Berry", "Berry pink with blush accents", { primary: "#A3335B", accent: "#FFC2D4", soft: "#FBE7EE" }),
  site("clinic", "CLN-LEAF", "Leaf", "Fresh green with sunny accents", { primary: "#23845A", accent: "#F6D365", soft: "#E2F4EA" }),
];

export const HOSPITAL_CARD_STYLES: readonly SiteCardStyle[] = [
  site("hospital", "HSP-TEAL", "Deep Teal", "Deep teal with amber accents", { primary: "#0A5F5E", accent: "#F2994A", soft: "#DDF0EF" }),
  site("hospital", "HSP-SAFFRON", "Saffron", "Rich amber with cream accents", { primary: "#B5561A", accent: "#FFE1B8", soft: "#FBE9D8" }),
  site("hospital", "HSP-NAVY", "Navy", "Navy blue with gold accents", { primary: "#1B3A6B", accent: "#F2C14E", soft: "#E6EDF8" }),
  site("hospital", "HSP-CRIMSON", "Crimson", "Crimson with peach accents", { primary: "#9E2A2B", accent: "#FFD6A5", soft: "#F9E5E5" }),
  site("hospital", "HSP-INDIGO", "Indigo", "Indigo with lavender accents", { primary: "#3B3F8F", accent: "#B9C3FF", soft: "#ECEEFB" }),
];

export const CARD_STYLES_BY_GROUP: Record<CardStyleGroup, readonly CardStyle[]> = {
  doctor: DOCTOR_CARD_STYLES,
  clinic: CLINIC_CARD_STYLES,
  hospital: HOSPITAL_CARD_STYLES,
};

export const CARD_STYLES: readonly CardStyle[] = [...DOCTOR_CARD_STYLES, ...CLINIC_CARD_STYLES, ...HOSPITAL_CARD_STYLES];

/** Codes a doctor page may use. */
export const DOCTOR_CARD_STYLE_CODES = DOCTOR_CARD_STYLES.map((s) => s.code) as [string, ...string[]];
/** Codes a clinic or hospital site may use (either group: both share the logo layout). */
export const SITE_CARD_STYLE_CODES = [...CLINIC_CARD_STYLES, ...HOSPITAL_CARD_STYLES].map((s) => s.code) as [string, ...string[]];

/** The doctor card's look when no style is set (Classic teal and amber). */
export const DEFAULT_DOCTOR_CARD_STYLE = DOCTOR_CARD_STYLES[0]!;

/** Look up a style by code (case and spacing don't matter: "doc-amber " works). */
export function findCardStyle(code: string | undefined | null): CardStyle | undefined {
  const c = code?.trim().toUpperCase();
  return c ? CARD_STYLES.find((s) => s.code === c) : undefined;
}

/** Doctor card colours for a code; unknown or empty → the default (Lagoon). */
export function doctorCardPalette(code: string | undefined | null): DoctorCardPalette {
  const s = findCardStyle(code);
  return s?.group === "doctor" ? s.palette : DEFAULT_DOCTOR_CARD_STYLE.palette;
}

/** Clinic/hospital card colours for a code; undefined when no site style is set (use the specialty theme). */
export function siteCardPalette(code: string | undefined | null): SiteCardPalette | undefined {
  const s = findCardStyle(code);
  return s && s.group !== "doctor" ? s.palette : undefined;
}

/** "#0A3F3F" → "rgba(10,63,63,0.14)" (for decorative glows; Satori-safe). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** "Hi, I'd like the DOC-LAGOON visiting card with my MediReach website." */
export function cardStyleWhatsappText(code: string): string {
  return `Hi, I'd like the ${code} visiting card with my MediReach website.`;
}
