/**
 * The 5 prescription templates (spec §8 redesign). All five share an identical
 * clinical core (built once in <PrescriptionSheet>); they differ ONLY in header
 * styling, accent colour, and sponsor-footer chrome. This module is the single
 * source of truth for those per-template colours — consumed by the sheet
 * component (preview + print + WhatsApp raster) and the customise-screen picker.
 *
 * Structural chrome (banded vs. underlined headers, gold rules, spines) lives in
 * the component's per-id switch; the colours a template shares with the common
 * core (the ℞ symbol and the sponsor pharmacy name) live here so they can never
 * drift out of sync.
 */

export type TemplateId =
  | "teal-classic"
  | "amber-minimal"
  | "slate-centered"
  | "teal-gold"
  | "amber-underline";

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  /** Accent colour — used for the ℞ symbol and the header chrome. */
  accent: string;
  /** Colour of the sponsor pharmacy name in the footer. */
  pharmacyColor: string;
  /** Sponsor-footer background; null = white/no fill. */
  sponsorBg: string | null;
  /** Optional background strip behind the vitals row (Template 1 only). */
  vitalsBg?: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "teal-classic",
    name: "Classic Teal",
    description: "Full-width teal header band with white text.",
    accent: "#0E7C7B",
    pharmacyColor: "#0E7C7B",
    sponsorBg: "#F1EFE8",
    vitalsBg: "#FAFBFB",
  },
  {
    id: "amber-minimal",
    name: "Minimal Amber",
    description: "Clean white header with an amber left spine.",
    accent: "#F2994A",
    pharmacyColor: "#B26A1F",
    sponsorBg: null,
  },
  {
    id: "slate-centered",
    name: "Centered Slate",
    description: "Centered header on a soft blue-grey band.",
    accent: "#2C5282",
    pharmacyColor: "#2C5282",
    sponsorBg: "#F5F8FC",
  },
  {
    id: "teal-gold",
    name: "Deep Teal & Gold",
    description: "Premium deep-teal band finished with a gold rule.",
    accent: "#134E4A",
    pharmacyColor: "#C9A227",
    sponsorBg: "#134E4A",
  },
  {
    id: "amber-underline",
    name: "Modern Amber",
    description: "Light, airy header with a full-width amber underline.",
    accent: "#F2994A",
    pharmacyColor: "#B26A1F",
    sponsorBg: "#F7F9FA",
  },
];

export const DEFAULT_TEMPLATE_ID: TemplateId = "teal-classic";

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

/** Resolve a stored template id, falling back to the default for legacy keys. */
export function getTemplate(id: string | undefined | null): TemplateConfig {
  return (id && BY_ID.get(id as TemplateId)) || BY_ID.get(DEFAULT_TEMPLATE_ID)!;
}

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];
