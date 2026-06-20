import "server-only";

/**
 * Field-level projections enforcing the receptionist permission matrix at the
 * DATA layer, not the UI (spec §5.2, §15.2). Clinical fields must never be
 * serialized into a response the receptionist receives — omitting them from the
 * rendered UI is not enough, since the API can be called directly.
 */

/**
 * Demographic-only patient projection for receptionist lookup (§5.2). Open
 * Decision §16.2 default: vitals (BP/weight/height/allergies) are treated as
 * quasi-clinical and HIDDEN on receptionist lookup — so they are intentionally
 * excluded here.
 */
export const RECEPTIONIST_PATIENT_FIELDS = {
  _id: 1,
  name: 1,
  address: 1,
  ageYears: 1,
  dob: 1,
  mobile: 1,
  gender: 1,
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
