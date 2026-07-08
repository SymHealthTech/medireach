/**
 * Medical Certificate — shared type definitions used by the pure render logic,
 * the Mongoose model, the API validation, and the React sheet/form. Three
 * certificate types are supported (spec: Medical Certificates feature). None of
 * this touches AI/Claude — a certificate is template + entered fields, so it
 * works identically on the Starter and Pro tiers.
 */

export const CERTIFICATE_TYPES = ["unfit", "fitness_resume", "fitness_job"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

/** Human labels for the type picker (order drives display). */
export const CERTIFICATE_TYPE_META: { type: CertificateType; label: string; blurb: string }[] = [
  { type: "unfit", label: "Sick Leave (Unfit for Duty)", blurb: "Certifies the patient is unfit for duty due to illness, for a rest period." },
  { type: "fitness_resume", label: "Fit to Resume After Illness", blurb: "Certifies the patient has recovered and is fit to resume duty." },
  { type: "fitness_job", label: "Fitness for Employment", blurb: "Certifies the patient is medically fit to undertake a job / employment." },
];

/**
 * All possible certificate fields. Which ones apply depends on `type`; the
 * render logic and validation only read the relevant subset. Dates are stored
 * as `yyyy-mm-dd` strings (from the native date input) so there is no timezone
 * ambiguity between the client preview and the persisted record.
 */
export interface CertificateFields {
  /** Type 1 — diagnosis / reason for unfitness. */
  diagnosis?: string;
  /** Type 1 — rest/leave period. */
  fromDate?: string;
  toDate?: string;
  /** Type 1 — total leave days, auto-calculated (inclusive) from from/to. */
  days?: number;
  /** Type 2 — prior illness the patient has recovered from. */
  illness?: string;
  /** Type 2 — fit to resume duty with effect from this date. */
  resumeDate?: string;
  /** Type 3 — job / employer / purpose free text. */
  jobPurpose?: string;
  /** Type 3 — optional examination summary the doctor wants to note. */
  examinationSummary?: string;
  /** Types 1 & 2 — optional remarks. */
  remarks?: string;
}

/** The minimal patient shape a certificate needs (auto-filled from the record). */
export interface CertificatePatient {
  name: string;
  ageYears?: number;
  gender?: string; // "male" | "female" | "other"
}
