/**
 * Pure, framework-agnostic helpers that turn structured consultation data into
 * the display strings the prescription templates render. This is the shared
 * "clinical core" logic (spec §8) — built and tested ONCE, reused by all five
 * templates and by the on-screen preview, print, and WhatsApp raster paths.
 *
 * Everything here is a synchronous local transform driven by the abbreviation
 * dictionary (src/lib/abbreviations) — NO AI/Claude call — so it behaves
 * identically on the Starter and Pro tiers (spec cost rule).
 */

import { expandTiming } from "@/lib/abbreviations";

// ── Inputs ────────────────────────────────────────────────────────────────────

/** A subset of the medicine model needed to render an Rx row. */
export interface RxMedicineInput {
  type?: string;
  name: string;
  generic?: string;
  dose?: string;
  frequency?: string;
  timing?: string;
}

/** On-examination vitals, as stored on the visit. */
export interface VitalsInput {
  bp?: string;
  temp?: string;
  weight?: string;
  bsl?: string;
}

// ── Outputs ───────────────────────────────────────────────────────────────────

export interface RxMedicine {
  /** e.g. "Tab. Crocin 500mg" */
  name: string;
  /** italic salt/contents in brackets, e.g. "(Paracetamol 500mg)" — or "" */
  salt: string;
  /** dose grid, e.g. "1 - 1 - 1" */
  grid: string;
  /** timing + duration line, e.g. "before food" — or "" */
  timingLine: string;
}

export interface Vital {
  label: string;
  value: string;
}

// ── Dose grid ─────────────────────────────────────────────────────────────────

/**
 * Frequency → morning/afternoon/(evening)/night position mask (spec §8 dose
 * grid). A `1` slot is filled with the per-dose quantity; a `0` slot renders as
 * "0". Frequencies with no clean grid (SOS/Stat/weekly…) fall back to a single
 * quantity cell and let the timing line carry the meaning.
 */
const FREQUENCY_POSITIONS: Record<string, number[]> = {
  OD: [1, 0, 0],
  BD: [1, 0, 1],
  BID: [1, 0, 1],
  TDS: [1, 1, 1],
  TID: [1, 1, 1],
  QID: [1, 1, 1, 1],
  QDS: [1, 1, 1, 1],
  HS: [0, 0, 1],
};

/**
 * Normalise the per-slot quantity from the dose value. Plain numbers/fractions
 * ("1", "1/2", "1.5") pass through; volume/spoon doses render with their unit
 * spaced out ("1tsf" → "1 tsf", "5ml" → "5 ml"). Empty dose defaults to "1".
 */
export function doseQuantity(dose: string | undefined): string {
  const d = (dose ?? "").trim();
  if (!d) return "1";
  const spoon = d.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*tsf$/i);
  if (spoon) return `${spoon[1]} tsf`;
  const ml = d.match(/^(\d+(?:\.\d+)?)\s*ml$/i);
  if (ml) return `${ml[1]} ml`;
  return d;
}

/**
 * Build the dose-grid notation from the structured dose + frequency.
 *  TDS 1      → "1 - 1 - 1"
 *  BD 1       → "1 - 0 - 1"
 *  OD 1       → "1 - 0 - 0"
 *  QID 1      → "1 - 1 - 1 - 1"
 *  HS 1       → "0 - 0 - 1"
 *  BD 1/2     → "1/2 - 0 - 1/2"
 *  BD 1tsf    → "1 tsf - 0 - 1 tsf"
 */
export function doseGrid(dose: string | undefined, frequency: string | undefined): string {
  const qty = doseQuantity(dose);
  const positions = FREQUENCY_POSITIONS[(frequency ?? "").trim().toUpperCase()];
  if (!positions) return qty;
  return positions.map((slot) => (slot ? qty : "0")).join(" - ");
}

/**
 * The plain-language line under the grid: timing (before food / after food / at
 * bedtime / when needed) plus an optional duration. Uses the local timing
 * dictionary; never repeats the quantity/frequency already shown in the grid.
 */
export function timingLine(
  timing: string | undefined,
  frequency: string | undefined,
  duration?: string,
): string {
  const parts: string[] = [];
  const freq = (frequency ?? "").trim().toUpperCase();
  let t = (timing ?? "").trim();
  if (!t && freq === "SOS") t = "when needed";
  if (!t && freq === "STAT") t = "immediately";
  if (t) parts.push(expandTiming(t) ?? t.toLowerCase());
  if (duration && duration.trim()) parts.push(duration.trim());
  return parts.join(" · ");
}

/** Compose the left-hand medicine label, e.g. "Tab. Crocin 500mg". */
export function medicineName(m: RxMedicineInput): string {
  const type = (m.type ?? "").trim();
  const name = (m.name ?? "").trim();
  const prefix = type ? `${type}. ` : "";
  return `${prefix}${name}`.trim();
}

/** Map one structured medicine to its four render strings. */
export function toRxMedicine(m: RxMedicineInput): RxMedicine {
  const generic = (m.generic ?? "").trim();
  return {
    name: medicineName(m),
    salt: generic ? `(${generic})` : "",
    grid: doseGrid(m.dose, m.frequency),
    timingLine: timingLine(m.timing, m.frequency),
  };
}

// ── Vitals ────────────────────────────────────────────────────────────────────

/**
 * The vitals row shows only BP, Temp, Wt, BSL — and only those actually present
 * (spec §8). If none are present the caller renders no row at all. Units mirror
 * the consult O/E editor.
 */
export function buildVitals(oe: VitalsInput | undefined): Vital[] {
  if (!oe) return [];
  const out: Vital[] = [];
  if (oe.bp?.trim()) out.push({ label: "BP", value: `${oe.bp.trim()} mmHg` });
  if (oe.temp?.trim()) out.push({ label: "Temp", value: `${oe.temp.trim()}°F` });
  if (oe.weight?.trim()) out.push({ label: "Wt", value: `${oe.weight.trim()} kg` });
  if (oe.bsl?.trim()) out.push({ label: "BSL", value: `${oe.bsl.trim()} mg/dL` });
  return out;
}
