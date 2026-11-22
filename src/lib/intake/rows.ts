import { parseQualificationLine } from "./hints";
import { DEGREE_SUGGESTIONS } from "@/lib/suggestions";

/**
 * Table-style answers in the doctor's website form (qualifications, services,
 * awards, memberships), laid out like the admin editor: one row per item with
 * its own boxes. The answer is still stored as text, one line per row
 * ("MBBS (Medicine) – BJ Medical College – 2008"), so older forms, the admin
 * view and the import keep working.
 *
 * Pure module: used by the browser and the server.
 */

export type RowsKind = "qualifications" | "services" | "awards" | "memberships";

export interface RowColumn {
  key: string;
  label: string;
  placeholder?: string;
  /** "year": 4 digits. "choice": a dropdown (`choices`) with Other → Please specify. */
  type?: "text" | "year" | "choice";
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
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•*-]+/, "").trim())
    .filter(Boolean)
    .map((l) => ({ ...blankRow(def), ...def.parse(l) }));
  return rows.length ? rows : [blankRow(def)];
}

/** Rows → stored text (empty rows are left out). */
export const rowsToText = (def: RowsDef, rows: Row[]): string => rows.filter(rowHasContent).map(def.format).filter(Boolean).join("\n");
