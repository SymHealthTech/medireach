import "server-only";
import type { Dues } from "@/models/Visit";
import type { DuesStatus } from "@/lib/constants";

/**
 * Pure helpers for the Patient Dues feature — the clinic's own outstanding-fee
 * bookkeeping. This is COMPLETELY SEPARATE from MediReach subscription billing.
 *
 * All money math funnels through here so "fee − paid = due" and the derived
 * paid/partial/unpaid status stay consistent across capture (post-prescription
 * modal), settlement, and fee correction. Amounts are clamped to sane ranges so
 * a stray client value can never produce a negative due or over-collection.
 */

/** Round to whole rupees and clamp to a non-negative, sane maximum. */
export function sanitizeAmount(n: unknown, max = 10_000_000): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(Math.max(Math.round(v), 0), max);
}

/** Derive the paid/partial/unpaid status from fee and collected amount. */
export function duesStatus(feeAmount: number, amountPaid: number): DuesStatus {
  if (feeAmount <= 0 || amountPaid >= feeAmount) return "paid";
  if (amountPaid <= 0) return "unpaid";
  return "partial";
}

/**
 * Build a fresh Dues object for the initial capture in the post-prescription
 * modal. `feeAmount` is the fee charged (server-trusted, from the visit);
 * `amountPaid` is what the doctor confirms was collected now (clamped to the
 * fee). Whatever is unpaid becomes the outstanding due. A payment-history entry
 * is recorded when money actually changed hands.
 */
export function buildInitialDues(feeAmount: number, amountPaid: number, now = new Date()): Dues {
  const fee = sanitizeAmount(feeAmount);
  const paid = Math.min(sanitizeAmount(amountPaid), fee);
  return {
    feeAmount: fee,
    amountPaid: paid,
    dueAmount: fee - paid,
    status: duesStatus(fee, paid),
    recordedAt: now,
    payments: paid > 0 ? [{ amount: paid, at: now, note: "At consultation" }] : [],
  };
}
