"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, optionalText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { PAYMENT_MODES, PAYMENT_PURPOSES_V2 } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { applyPaymentToRenewal } from "@/lib/payments/apply";
import { revalidateSiteRoute } from "@/lib/public/revalidate";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";

const ADMINS = ["superadmin", "admin"] as const;
const optId = z
  .string()
  .refine((s) => s === "" || /^[a-f0-9]{24}$/i.test(s), "Invalid id.")
  .transform((s) => s || undefined);

const fields = z
  .object({
    doctorId: optId,
    establishmentId: optId,
    amount: z.number({ required_error: "Amount is required." }).positive("Amount must be more than 0.").max(10_000_000),
    gstIncluded: z.boolean(),
    mode: z.enum(PAYMENT_MODES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    purpose: z.enum(PAYMENT_PURPOSES_V2),
    invoiceNo: optionalText(40),
    notes: optionalText(1000),
  })
  .refine((p) => Boolean(p.doctorId) !== Boolean(p.establishmentId), {
    message: "Choose either a doctor or a clinic/hospital.",
    path: ["doctorId"],
  });

/** Next invoice number for the payment's month: MR-YYYYMM-0001. */
async function nextInvoiceNo(date: Date): Promise<string> {
  const ym = new Date(date.getTime() + 5.5 * 3600_000).toISOString().slice(0, 7).replace("-", "");
  const prefix = `MR-${ym}-`;
  const last = await Payment.findOne({ invoiceNo: { $regex: `^${prefix}` } }).sort({ invoiceNo: -1 }).select({ invoiceNo: 1 }).lean();
  const n = last?.invoiceNo ? Number(last.invoiceNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Record a payment. Setup and add-on payments start the renewal clock (due
 * one year later); renewal payments move it on a year and bring a lapsed site
 * back. Returns the new due date so the UI can say so.
 */
export const recordPaymentAction = adminAction({ schema: fields, roles: ADMINS }, async (input, admin) => {
  const exists = input.doctorId
    ? await DoctorProfile.exists({ _id: input.doctorId })
    : await Establishment.exists({ _id: input.establishmentId });
  if (!exists) throw new ActionError("That doctor or clinic no longer exists.", { doctorId: "Not found." });

  const date = new Date(`${input.date}T12:00:00+05:30`);
  let payment;
  for (let attempt = 0; attempt < 3 && !payment; attempt++) {
    try {
      payment = await Payment.create({ ...input, date, invoiceNo: input.invoiceNo ?? (await nextInvoiceNo(date)) });
    } catch (err) {
      const dup = err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000;
      if (!dup || input.invoiceNo) throw dup ? new ActionError("That invoice number is already used.", { invoiceNo: "Already used." }) : err;
    }
  }
  if (!payment) throw new ActionError("Couldn't assign an invoice number. Please try again.");

  const change = await applyPaymentToRenewal({ ...input, date });
  if (change?.restored) revalidateSiteRoute(change.route);

  await audit(auditCtx(admin), "payment.record", {
    entity: "Payment",
    entityId: payment._id,
    diff: {
      amount: input.amount,
      purpose: input.purpose,
      invoiceNo: payment.invoiceNo,
      ...(change ? { renewalDueDate: { from: change.before.renewalDueDate ?? null, to: change.after.renewalDueDate ?? null } } : {}),
    },
  });
  return {
    id: String(payment._id),
    invoiceNo: payment.invoiceNo,
    ...(change?.after.renewalDueDate ? { renewalDue: formatDate(change.after.renewalDueDate) } : {}),
    restored: Boolean(change?.restored),
  };
});

/**
 * Delete a payment record. Renewal dates it set are NOT rolled back (later
 * payments may depend on them); fix them on the site's Business step.
 */
export const deletePaymentAction = adminAction({ schema: z.object({ id: objectId }), roles: ["superadmin"] }, async ({ id }, admin) => {
  const p = await Payment.findByIdAndDelete(id).lean();
  if (!p) throw new ActionError("Payment not found.");
  await audit(auditCtx(admin), "payment.delete", { entity: "Payment", entityId: id, diff: { amount: p.amount, invoiceNo: p.invoiceNo } });
  return { id };
});
