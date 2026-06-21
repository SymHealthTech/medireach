/**
 * Prescription template presets (spec §8, §12 Design Prescription). v1 is
 * preset-plus-light-customization (Open Decision §16.3 default): the doctor
 * picks one of these and lightly customizes clinic name + logo placement; the
 * footer is the sponsor ad slot. Each preset is a small style config consumed
 * both by the on-screen picker preview and the canvas image renderer, so what
 * the doctor previews is exactly what gets shared.
 */
export interface TemplatePreset {
  key: string;
  name: string;
  description: string;
  accent: string; // header/accent color (hex)
  ink: string; // body text color
  headerAlign: "left" | "center";
  headerLayout?: "three-column"; // overrides headerAlign for structured layouts
  showRule: boolean; // horizontal rule under the header
  headerBg: string | null; // filled header band, or null for plain
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    key: "classic",
    name: "Classic",
    description: "Teal header band — clinic left, logo center, doctor details right.",
    accent: "#0E7C7B",
    ink: "#1F2933",
    headerAlign: "center",
    headerLayout: "three-column",
    showRule: true,
    headerBg: "#0E7C7B",
  },
  {
    key: "minimal",
    name: "Minimal",
    description: "Left-aligned, no color band — maximum whitespace.",
    accent: "#0E7C7B",
    ink: "#1F2933",
    headerAlign: "left",
    showRule: true,
    headerBg: null,
  },
  {
    key: "warm",
    name: "Warm",
    description: "Amber accents, centered — friendly and approachable.",
    accent: "#F2994A",
    ink: "#1F2933",
    headerAlign: "center",
    showRule: true,
    headerBg: "#F2994A",
  },
  {
    key: "bold",
    name: "Bold",
    description: "Strong teal band with larger type — easy to read.",
    accent: "#0E7C7B",
    ink: "#121417",
    headerAlign: "left",
    showRule: false,
    headerBg: "#0E7C7B",
  },
  {
    key: "slate",
    name: "Slate",
    description: "Understated slate header — professional and quiet.",
    accent: "#3B4754",
    ink: "#1F2933",
    headerAlign: "center",
    showRule: true,
    headerBg: "#3B4754",
  },
];

export const DEFAULT_PRESET_KEY = "classic";

export function getPreset(key: string | undefined): TemplatePreset {
  return TEMPLATE_PRESETS.find((p) => p.key === key) ?? TEMPLATE_PRESETS[0]!;
}
