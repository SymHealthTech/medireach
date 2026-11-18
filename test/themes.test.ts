import { describe, expect, it } from "vitest";
import { scanText } from "@/lib/compliance/scan";
import { THEME_ICONS } from "@/themes/icons";
import {
  CLINIC_SECTIONS,
  HOSPITAL_SECTIONS,
  SITE_SECTIONS,
  SPECIALTY_THEMES,
  getTheme,
  sectionLabel,
  sectionsFor,
  themeCssVars,
} from "@/themes/specialty";

/** WCAG relative luminance / contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// DESIGN_BRIEF.md §5 table, in order.
const BRIEF = [
  ["General OPD", "#0E3B3C", "#E3A23B", "#DCE8E2"],
  ["Skin & Hair", "#5B3A4A", "#D9A38B", "#F4E6E0"],
  ["Dental", "#1F4E6B", "#7FC8D6", "#E3F2F5"],
  ["Eye", "#203A5C", "#6BA6D6", "#E4EEF7"],
  ["ENT", "#2E4A3F", "#C9A34A", "#E9EFE6"],
  ["Cardiology", "#5A1F2B", "#E07A6B", "#F6E5E3"],
  ["Ayurveda", "#4A5A23", "#C88A2C", "#F1EEDC"],
  ["Homeopathy", "#2F5D50", "#9DBF7A", "#EAF2E3"],
  ["Physiotherapy", "#174A5C", "#F08A4B", "#E2EFF2"],
  ["Paediatrics", "#2B4C7E", "#F2B84B", "#EAF0FA"],
  ["Gynaecology", "#5C2E55", "#E39AB1", "#F6E8EF"],
  ["Orthopaedics", "#2C3E50", "#E3A23B", "#E8ECEF"],
  ["Small hospital", "#0E3B3C", "#C8664B", "#E6EFEC"],
];

describe("specialty themes", () => {
  it("has the 13 themes from the design brief with its exact palettes", () => {
    expect(SPECIALTY_THEMES.map((t) => [t.name, t.palette.primary, t.palette.accent, t.palette.soft])).toEqual(BRIEF);
    expect(new Set(SPECIALTY_THEMES.map((t) => t.key)).size).toBe(13);
  });

  it("keeps primary text readable on white and on the soft band (WCAG AA)", () => {
    for (const t of SPECIALTY_THEMES) {
      expect(contrast(t.palette.primary, "#FFFFFF"), t.key).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.palette.primary, t.palette.soft), t.key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has an icon component for every theme", () => {
    for (const t of SPECIALTY_THEMES) expect(THEME_ICONS[t.icon], t.key).toBeTruthy();
  });

  it("uses valid, unique sections and service groups", () => {
    for (const t of SPECIALTY_THEMES) {
      expect(new Set(t.sectionOrder).size, t.key).toBe(t.sectionOrder.length);
      for (const s of t.sectionOrder) expect(SITE_SECTIONS).toContain(s);
      for (const s of Object.keys(t.sectionLabels)) expect(SITE_SECTIONS).toContain(s);
      const groups: readonly string[] = t.serviceGroups;
      for (const svc of t.suggestedServices) {
        const group = "group" in svc ? svc.group : undefined;
        if (groups.length) expect(groups, `${t.key}: ${svc.name}`).toContain(group);
        else expect(group, `${t.key}: ${svc.name}`).toBeUndefined();
      }
    }
  });

  it("passes the NMC phrase scanner (labels, services, points)", () => {
    for (const t of SPECIALTY_THEMES) {
      const texts = [
        t.name,
        ...t.points,
        ...t.serviceGroups,
        ...t.suggestedServices.map((s) => s.name),
        ...Object.values(t.sectionLabels),
      ];
      for (const text of texts) expect(scanText(text), `${t.key}: ${text}`).toEqual([]);
    }
  });

  it("shows only clinic sections on clinic sites and every section on hospital sites", () => {
    for (const t of SPECIALTY_THEMES) {
      const clinic = sectionsFor(t, "clinic");
      expect([...clinic].sort()).toEqual([...CLINIC_SECTIONS].sort());
      const hospital = sectionsFor(t, "hospital");
      expect([...hospital].sort()).toEqual([...SITE_SECTIONS].sort());
      for (const s of HOSPITAL_SECTIONS) expect(clinic).not.toContain(s);
    }
    // Theme order is kept.
    expect(sectionsFor(getTheme("general-opd"), "clinic")[0]).toBe("timings");
  });

  it("falls back to the kind's default theme for unknown keys", () => {
    expect(getTheme("nope").key).toBe("general-opd");
    expect(getTheme(undefined, "hospital").key).toBe("small-hospital");
    expect(sectionLabel(getTheme("dental"), "services")).toBe("Procedures");
    expect(sectionLabel(getTheme("dental"), "gallery")).toBe("Photos");
    expect(themeCssVars(getTheme("eye"))["--theme-primary"]).toBe("#203A5C");
  });
});
