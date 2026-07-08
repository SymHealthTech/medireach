import { z } from "zod";
import { fields } from "@/lib/api/validate";

/**
 * Patient Dues request schemas (clinic fee bookkeeping — the Patient Dues
 * feature; NOT MediReach subscription billing). The fee itself is never taken
 * from the client on capture — the server reads it from the confirmed visit so
 * it can't be tampered. Only the amount the doctor says was collected is
 * accepted, and it's clamped server-side.
 */

const money = z.number().min(0).max(10_000_000);

/** POST /api/dues — capture payment from the post-prescription modal. */
export const duesCaptureSchema = z.object({
  visitId: fields.objectId,
  amountPaid: money,
});
export type DuesCaptureInput = z.infer<typeof duesCaptureSchema>;

/**
 * POST /api/dues/[patientId] — settle a due (record a payment) or adjust the
 * fee (correct a mistyped amount) on one of the patient's visits.
 *  - settle: `amount` is applied to the visit's outstanding balance.
 *  - adjust: `feeAmount` replaces the charged fee; the due is recomputed against
 *            what has already been collected.
 */
export const duesActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("settle"),
    visitId: fields.objectId,
    amount: money,
    note: z.string().trim().max(200).optional(),
  }),
  z.object({
    action: z.literal("adjust"),
    visitId: fields.objectId,
    feeAmount: money,
  }),
]);
export type DuesActionInput = z.infer<typeof duesActionSchema>;
