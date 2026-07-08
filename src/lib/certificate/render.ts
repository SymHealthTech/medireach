/**
 * Pure, framework-agnostic helpers that turn the certificate type + entered
 * fields into the professionally-worded statement the A4 sheet renders. Mirrors
 * the prescription render layer (src/lib/prescription/render.ts): built and
 * tested ONCE, reused by the live preview, the print/PDF raster, and the
 * WhatsApp share — with NO AI/Claude call, so it behaves identically on Starter
 * and Pro (spec cost rule).
 */

import type { CertificateFields, CertificatePatient, CertificateType } from "@/lib/certificate/types";

/** Placeholder shown in the live preview for a required field the doctor has
 *  not filled yet, so the sentence keeps its shape while typing. */
const BLANK = "__________";

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Fill in an entered value, or a placeholder when it is still blank. */
function val(s: string | undefined | null): string {
  const t = (s ?? "").trim();
  return t || BLANK;
}

/** The centered heading — "MEDICAL CERTIFICATE" for sick leave, otherwise
 *  "FITNESS CERTIFICATE" (types 2 & 3). */
export function certificateTitle(type: CertificateType): string {
  return type === "unfit" ? "MEDICAL CERTIFICATE" : "FITNESS CERTIFICATE";
}

/** Subject pronoun from the patient's sex ("he" / "she"), falling back to
 *  "the patient" when sex is unknown. */
export function subjectPronoun(gender?: string): string {
  const g = (gender ?? "").toLowerCase();
  if (g === "male") return "he";
  if (g === "female") return "she";
  return "the patient";
}

/** Object pronoun from the patient's sex ("him" / "her"), falling back to the
 *  neutral "him/her" as the spec directs when sex is unknown. */
export function objectPronoun(gender?: string): string {
  const g = (gender ?? "").toLowerCase();
  if (g === "male") return "him";
  if (g === "female") return "her";
  return "him/her";
}

/** "34 yrs / Male" — the age/sex tag used in the body statement. Drops either
 *  half gracefully when it is missing. */
export function ageSexLabel(patient: CertificatePatient): string {
  const parts: string[] = [];
  if (patient.ageYears != null) parts.push(`${patient.ageYears} yrs`);
  if (patient.gender) parts.push(cap(patient.gender));
  return parts.join(" / ");
}

/**
 * Inclusive number of leave days between two `yyyy-mm-dd` dates (Type 1). Both
 * endpoints count, so "from 8th to 8th" is 1 day and "8th to 10th" is 3. Returns
 * 0 when either date is missing or the range is invalid (to before from).
 */
export function daysBetween(fromDate?: string, toDate?: string): number {
  if (!fromDate || !toDate) return 0;
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return diff < 0 ? 0 : diff + 1;
}

/** Format a `yyyy-mm-dd` date as "08 Jul 2026" (en-IN), or a placeholder when
 *  blank. Parsed at local midnight so the shown day never drifts by timezone. */
export function formatCertDate(iso?: string): string {
  const t = (iso ?? "").trim();
  if (!t) return BLANK;
  const d = new Date(`${t}T00:00:00`);
  if (Number.isNaN(d.getTime())) return BLANK;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export interface RenderedCertificate {
  title: string;
  /** The body paragraphs, in order — the main formal statement, then any
   *  optional remarks / examination summary lines. */
  paragraphs: string[];
}

/**
 * Compose the full certificate body for a type. `days` is recomputed here from
 * the from/to dates (not trusted from the caller) so the preview, the saved
 * record, and the printed sheet can never disagree on the leave length.
 */
export function renderCertificate(
  type: CertificateType,
  fields: CertificateFields,
  patient: CertificatePatient,
): RenderedCertificate {
  const name = val(patient.name);
  const ageSex = ageSexLabel(patient);
  const who = ageSex ? `${name}, ${ageSex},` : `${name}`;
  const title = certificateTitle(type);
  const paragraphs: string[] = [];

  if (type === "unfit") {
    const days = daysBetween(fields.fromDate, fields.toDate);
    const dayWord = days === 1 ? "day" : "days";
    const period =
      days > 0
        ? `for ${days} ${dayWord} from ${formatCertDate(fields.fromDate)} to ${formatCertDate(fields.toDate)}`
        : `from ${formatCertDate(fields.fromDate)} to ${formatCertDate(fields.toDate)}`;
    paragraphs.push(
      `This is to certify that ${who} is suffering from ${val(fields.diagnosis)} and is advised rest / is unfit for duty ${period}.`,
    );
  } else if (type === "fitness_resume") {
    paragraphs.push(
      `This is to certify that ${who} who was suffering from ${val(fields.illness)}, ` +
        `has now recovered and is medically fit to resume duty with effect from ${formatCertDate(fields.resumeDate)}.`,
    );
  } else {
    // fitness_job
    const them = objectPronoun(patient.gender);
    const purpose = (fields.jobPurpose ?? "").trim();
    const undertake = purpose ? purpose : "employment";
    paragraphs.push(
      `This is to certify that I have examined ${who} and found ${them} to be medically fit to undertake ${undertake}.`,
    );
    const summary = (fields.examinationSummary ?? "").trim();
    if (summary) paragraphs.push(summary);
  }

  const remarks = (fields.remarks ?? "").trim();
  if (remarks && type !== "fitness_job") paragraphs.push(`Remarks: ${remarks}`);

  return { title, paragraphs };
}
