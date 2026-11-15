"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, optionalText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { PAYMENT_MODES, PAYMENT_PURPOSES } from "@/lib/constants";
import { Payment } from "@/models/Payment";

const ADMINS = ["superadmin", "admin"] as const;
const optId = z
  .string()
  .refine((s) => s === "" || /^[a-f0-9]{24}$/i.test(s), "Invalid id.")
  .transform((s) => s || undefined);

const fields = z
  .object({
    doctorId: optId,
    hospitalId: optId,
    amount: z.number({ required_error: "Amount is required." }).positive("Amount must be more than 0.").max(10_000_000),
    gstIncluded: z.boolean(),
    mode: z.enum(PAYMENT_MODES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    purpose: z.enum(PAYMENT_PURPOSES),
    invoiceNo: optionalText(40),
    notes: optionalText(1000),
  })
  .refine((p) => p.doctorId || p.hospitalId, { message: "Choose a doctor or a hospital.", path: ["doctorId"] });

/** Next invoice number for the payment's month: MR-YYYYMM-0001. */
async function nextInvoiceNo(date: Date): Promise<string> {
  const ym = new Date(date.getTime() + 5.5 * 3600_000).toISOString().slice(0, 7).replace("-", "");
  const prefix = `MR-${ym}-`;
  const last = await Payment.findOne({ invoiceNo: { $regex: `^${prefix}` } }).sort({ invoiceNo: -1 }).select({ invoiceNo: 1 }).lean();
  const n = last?.invoiceNo ? Number(last.invoiceNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export const recordPaymentAction = adminAction({ schema: fields, roles: ADMINS }, async (input, admin) => {
  const date = new Date(`${input.date}T12:00:00+05:30`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const p = await Payment.create({ ...input, date, invoiceNo: input.invoiceNo ?? (await nextInvoiceNo(date)) });
      await audit(auditCtx(admin), "payment.record", {
        entity: "Payment",
        entityId: p._id,
        diff: { amount: input.amount, purpose: input.purpose, invoiceNo: p.invoiceNo },
      });
      return { id: String(p._id), invoiceNo: p.invoiceNo };
    } catch (err) {
      const dup = err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000;
      if (!dup || input.invoiceNo) throw dup ? new ActionError("That invoice number is already used.", { invoiceNo: "Already used." }) : err;
    }
  }
  throw new ActionError("Couldn't assign an invoice number. Please try again.");
});

export const deletePaymentAction = adminAction({ schema: z.object({ id: objectId }), roles: ["superadmin"] }, async ({ id }, admin) => {
  const p = await Payment.findByIdAndDelete(id).lean();
  if (!p) throw new ActionError("Payment not found.");
  await audit(auditCtx(admin), "payment.delete", { entity: "Payment", entityId: id, diff: { amount: p.amount, invoiceNo: p.invoiceNo } });
  return { id };
});
