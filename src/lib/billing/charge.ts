import { BILLING, type Tier } from "@/lib/constants";

/**
 * Cycle charge calculation (spec §11 + two-tier pricing) — a pure, tested
 * function run once per cycle close and branched on the subscription tier.
 *
 * Starter: flat ₹499 per 30-day cycle, regardless of patient count. Starter
 *   never triggers a paid API, so there is no per-patient usage cost to recover.
 *
 * Pro: charge = greater of (₹299 monthly minimum) or (per-patient total), where
 *   per-patient is ₹1.5/patient up to 1,000 patients in the cycle, and
 *   ₹1/patient for each patient beyond 1,000. The ₹299 floor is overtaken by the
 *   per-patient calculation at ~200 patients/cycle. (Unchanged existing logic.)
 *
 * `patientCount` is the number of confirmed consultations in the cycle window
 * (each consultation is the billable unit — it's what drives the AI/voice cost
 * the Pro pricing is based on). It is ignored for Starter.
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

/** Pro tier: greater of the ₹299 floor or the per-patient total. */
export function computeProCharge(patientCount: number): number {
  return round2(Math.max(BILLING.MONTHLY_MINIMUM_INR, computePerPatientTotal(patientCount)));
}

/**
 * The charge for a cycle, branched by tier. Defaults to Pro when a tier isn't
 * supplied so any un-migrated caller keeps the legacy behaviour.
 */
export function computeCycleCharge(patientCount: number, tier: Tier = "pro"): number {
  if (tier === "starter") return BILLING.STARTER_FLAT_INR;
  return computeProCharge(patientCount);
}

/** Round to 2 decimal places (per-patient rates can produce a .5 rupee). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
