import "server-only";

/**
 * Field-level projections enforcing the receptionist permission matrix at the
 * DATA layer, not the UI (spec §5.2, §15.2). Clinical fields must never be
 * serialized into a response the receptionist receives — omitting them from the
 * rendered UI is not enough, since the API can be called directly.
 */

/**
 * Patient fields visible to a receptionist (§5.2). Intake vitals are included
 * because the receptionist is the one who enters and edits them — hiding values
 * they own would break the edit flow. Clinical history (diagnoses, medicines,
 * notes) remains doctor-only and is never on the Patient document anyway.
 */
export const RECEPTIONIST_PATIENT_FIELDS = {
  _id: 1,
  code: 1,
  name: 1,
  address: 1,
  ageYears: 1,
  dob: 1,
  mobile: 1,
  gender: 1,
  bp: 1,
  weightKg: 1,
  heightCm: 1,
  temp: 1,
  allergicTo: 1,
  emergencyContact: 1,
} as const;

/**
 * Today's-queue projection for the receptionist (§5.2, §7.1): enough to render
 * the queue and the examined/pending state, with zero clinical content. Visit
 * status drives the disabled/locked rendering.
 */
export const RECEPTIONIST_QUEUE_FIELDS = {
  _id: 1,
  patientId: 1,
  type: 1,
  status: 1,
  createdAt: 1,
} as const;

/**
 * Last-7-days list for the receptionist (§5.2): name + mobile only, no
 * drill-down, no clinical content.
 */
export const RECEPTIONIST_RECENT_FIELDS = {
  _id: 1,
  name: 1,
  mobile: 1,
} as const;
