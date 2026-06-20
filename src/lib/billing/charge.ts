import { BILLING } from "@/lib/constants";

/**
 * Cycle charge calculation (spec §11) — built as its own pure, tested function
 * per the build-prompt, run once per cycle close.
 *
 * Rule: charge = greater of (₹299 monthly minimum) or (per-patient total),
 * where per-patient is ₹1.5/patient up to 1,000 patients in the cycle, and
 * ₹1/patient for each patient beyond 1,000. The ₹299 floor is overtaken by the
 * per-patient calculation at ~200 patients/cycle.
 *
 * `patientCount` is the number of confirmed consultations in the cycle window
 * (each consultation is the billable unit — it's what drives the AI/voice cost
 * the pricing is based on).
 */
export function computePerPatientTotal(patientCount: number): number {
  const n = Math.max(0, Math.floor(patientCount));
  const { DISCOUNT_THRESHOLD, PER_PATIENT_INR, PER_PATIENT_DISCOUNTED_INR } = BILLING;

  if (n <= DISCOUNT_THRESHOLD) {
    return round2(n * PER_PATIENT_INR);
  }
  const base = DISCOUNT_THRESHOLD * PER_PATIENT_INR;
  const extra = (n - DISCOUNT_THRESHOLD) * PER_PATIENT_DISCOUNTED_INR;
  return round2(base + extra);
}

export function computeCycleCharge(patientCount: number): number {
  return round2(Math.max(BILLING.MONTHLY_MINIMUM_INR, computePerPatientTotal(patientCount)));
}

/** Round to 2 decimal places (per-patient rates can produce a .5 rupee). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
