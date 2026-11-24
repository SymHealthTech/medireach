import { parseQualificationLine } from "./hints";
import { BED_TYPE_SUGGESTIONS, DEGREE_SUGGESTIONS } from "@/lib/suggestions";

/**
 * Table-style answers in the doctor's website form (qualifications, services,
 * awards, memberships), laid out like the admin editor: one row per item with
 * its own boxes. The answer is still stored as text, one line per row
 * ("MBBS (Medicine) – BJ Medical College – 2008"), so older forms, the admin
 * view and the import keep working.
 *
 * Pure module: used by the browser and the server.
 */

export type RowsKind = "qualifications" | "degrees" | "services" | "facilities" | "equipment" | "bedTypes" | "awards" | "memberships";

export interface RowColumn {
  key: string;
  label: string;
  placeholder?: string;
  /** "year": 4 digits. "number": a small count. "choice": a dropdown (`choices`) with Other → Please specify. */
  type?: "text" | "year" | "number" | "choice";
  choices?: readonly string[];
  required?: boolean;
}

export type Row = Record<string, string>;

export interface RowsDef {
  /** "Qualification" → "Qualification 1", "Add qualification". */
  item: string;
  max: number;
  columns: RowColumn[];
  format: (r: Row) => string;
  parse: (line: string) => Row;
  /** How rows sit in the stored text: one per line (default) or, for "degrees", one line "MBBS, MD (Dermatology)". */
  split?: (text: string) => string[];
  join?: (items: string[]) => string;
}

const DASH = /\s+[–—-]\s+/;
const YEAR_AT_END = /[\s–—,(-]*\(?\b(19[4-9]\d|20\d{2})\)?\s*$/;
const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const join = (parts: (string | undefined)[]) => parts.map(clean).filter(Boolean).join(" – ");

/** "Award – Given by – 2019" → { rest: "Award – Given by", year: "2019" }. */
function splitYear(line: string): { rest: string; year: string } {
  const m = line.match(YEAR_AT_END);
  return m ? { rest: line.slice(0, m.index).trim(), year: m[1]! } : { rest: line.trim(), year: "" };
}

/** "MBBS, MD (Dermatology, Venereology)" → ["MBBS", "MD (Dermatology, Venereology)"]: commas inside brackets stay. */
export function splitDegrees(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n")) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => clean(x.replace(/^[\s•*-]+/, ""))).filter(Boolean);
}

/** Degrees → the one line the site shows ("MBBS, MD (Dermatology)"). */
export const joinDegrees = (items: string[]) => items.map(clean).filter(Boolean).join(", ");

/** Name + short description rows (clinic and hospital facilities, equipment), like the admin editor's lists. */
function named(item: string, max: number, namePlaceholder: string, descPlaceholder: string): RowsDef {
  return {
    item,
    max,
    columns: [
      { key: "name", label: "Name", placeholder: namePlaceholder, required: true },
      { key: "description", label: "Short description (optional)", placeholder: descPlaceholder },
    ],
    format: (r) => join([r.name, r.description]),
    parse: (line) => {
      const [name = "", ...rest] = line.split(DASH);
      return { name: name.trim(), description: rest.join(" – ").trim() };
    },
  };
}

export const ROWS: Record<RowsKind, RowsDef> = {
  qualifications: {
    item: "Qualification",
    max: 12,
    columns: [
      { key: "degree", label: "Degree", type: "choice", choices: DEGREE_SUGGESTIONS, required: true },
      { key: "specialization", label: "Specialization", placeholder: "e.g. Medicine, Paediatrics" },
      { key: "institute", label: "Institute", placeholder: "BJ Medical College, Pune" },
      { key: "year", label: "Year", type: "year", placeholder: "2008" },
    ],
    format: (r) => {
      const degree = clean(r.degree);
      const spec = clean(r.specialization);
      return join([degree && spec ? `${degree} (${spec})` : degree || spec, r.institute, r.year]);
    },
    parse: (line): Row => {
      const q = parseQualificationLine(line);
      return q ? { degree: q.degree, specialization: q.specialization, institute: q.institute, year: q.year ? String(q.year) : "" } : { degree: line.trim() };
    },
  },
  // A clinic or hospital doctor's degrees, shown on the site as one line.
  degrees: {
    item: "Degree",
    max: 8,
    columns: [
      { key: "degree", label: "Degree", type: "choice", choices: DEGREE_SUGGESTIONS, required: true },
      { key: "specialization", label: "Specialization (optional)", placeholder: "e.g. Dermatology" },
    ],
    format: (r) => {
      const degree = clean(r.degree);
      const spec = clean(r.specialization);
      return degree && spec ? `${degree} (${spec})` : degree || spec;
    },
    parse: (item): Row => {
      const m = item.match(/^(.+?)\s*\((.+)\)$/);
      return m ? { degree: m[1]!.trim(), specialization: m[2]!.trim() } : { degree: item.trim(), specialization: "" };
    },
    split: splitDegrees,
    join: joinDegrees,
  },
  services: {
    item: "Service",
    max: 30,
    columns: [
      { key: "name", label: "Name", placeholder: "Diabetes care", required: true },
      { key: "description", label: "Short description (optional)", placeholder: "Check-ups, diet advice and follow-up" },
    ],
    format: (r) => join([r.name, r.description]),
    parse: (line) => {
      const [name = "", ...rest] = line.split(DASH);
      return { name: name.trim(), description: rest.join(" – ").trim() };
    },
  },
  facilities: named("Facility", 40, "Wheelchair access", "Ramp at the entrance and a lift"),
  equipment: named("Equipment", 40, "Digital X-ray", "Reports in 30 minutes"),
  // Hospital beds by type ("ICU – 2"), like the admin editor's bed types.
  bedTypes: {
    item: "Bed type",
    max: 10,
    columns: [
      { key: "type", label: "Bed type", type: "choice", choices: BED_TYPE_SUGGESTIONS, required: true },
      { key: "count", label: "Number of beds", type: "number", placeholder: "2" },
    ],
    format: (r) => join([r.type, r.count]),
    parse: (line) => {
      const m = line.match(/^(.+?)\s*(?:[–—:x×-]\s*)?(\d{1,3})\s*(?:beds?)?$/i);
      return m ? { type: m[1]!.replace(/[\s–—:-]+$/, "").trim(), count: m[2]! } : { type: line.trim(), count: "" };
    },
  },
  awards: {
    item: "Award",
    max: 15,
    columns: [
      { key: "title", label: "Award", placeholder: "Best paper award", required: true },
      { key: "awardingBody", label: "Given by", placeholder: "Indian Medical Association" },
      { key: "year", label: "Year", type: "year", placeholder: "2019" },
    ],
    format: (r) => join([r.title, r.awardingBody, r.year]),
    parse: (line) => {
      const { rest, year } = splitYear(line);
      const [title = "", ...body] = rest.split(DASH);
      return { title: title.trim(), awardingBody: body.join(" – ").trim(), year };
    },
  },
  memberships: {
    item: "Membership",
    max: 15,
    columns: [
      { key: "name", label: "Association", placeholder: "Indian Medical Association", required: true },
      { key: "since", label: "Member since (year)", type: "year", placeholder: "2010" },
    ],
    format: (r) => join([r.name, r.since]),
    parse: (line) => {
      const { rest, year } = splitYear(line);
      return { name: rest, since: year };
    },
  },
};

export const blankRow = (def: RowsDef): Row => Object.fromEntries(def.columns.map((c) => [c.key, ""]));
export const rowHasContent = (r: Row) => Object.values(r).some((v) => clean(v) !== "");

/** Stored text → rows (always at least one, so there is a box to type in). */
export function textToRows(def: RowsDef, text: string): Row[] {
  const items = def.split
    ? def.split(text)
    : text
        .split(/\r?\n/)
        .map((l) => l.replace(/^[\s•*-]+/, "").trim())
        .filter(Boolean);
  const rows = items.map((l) => ({ ...blankRow(def), ...def.parse(l) }));
  return rows.length ? rows : [blankRow(def)];
}

/** Rows → stored text (empty rows are left out). */
export const rowsToText = (def: RowsDef, rows: Row[]): string => {
  const items = rows.filter(rowHasContent).map(def.format).filter(Boolean);
  return def.join ? def.join(items) : items.join("\n");
};
