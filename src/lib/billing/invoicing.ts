import "server-only";
import type { Types } from "mongoose";
import { Invoice } from "@/models/Invoice";
import { Visit } from "@/models/Visit";
import { Sponsor } from "@/models/Sponsor";
import { Doctor } from "@/models/Doctor";
import { computeCycleCharge } from "@/lib/billing/charge";
import { computeInclusiveTax, isInterStateSupply } from "@/lib/billing/tax";
import type { CycleInfo } from "@/lib/billing/cycle";

/**
 * Generate (idempotently) the invoice for a closed billing cycle (spec §11).
 * Counts the confirmed consultations in the cycle window, computes the charge
 * via the tested function, and records the payer — a sponsoring store if one is
 * actively responsible (§8), else the doctor. Safe to call repeatedly: the
 * unique (doctorId, cycleNumber) index plus an existence check prevent dupes.
 */
export async function generateInvoiceForCycle(
  doctorId: Types.ObjectId | string,
  cycle: CycleInfo,
): Promise<{ created: boolean; invoiceId?: string }> {
  const existing = await Invoice.findOne({ doctorId, cycleNumber: cycle.cycleNumber }).lean();
  if (existing) return { created: false, invoiceId: String(existing._id) };

  // Certificate-only visits use no AI/voice and cost the business nothing, so
  // they must NOT count toward Pro per-patient billing (₹1.5/patient). `$ne`
  // also matches legacy visits that predate the visitMode field (they are
  // consultations). Starter is flat, so this has no effect there.
  const patientCount = await Visit.countDocuments({
    doctorId,
    status: "confirmed",
    visitMode: { $ne: "certificate_only" },
    confirmedAt: { $gte: cycle.periodStart, $lt: cycle.periodEnd },
  });
  // Bill this cycle at the tier that applied DURING it (currentCycleTier — the
  // snapshot the billing cron maintains), not the doctor's live tier: an
  // immediate upgrade unlocks voice now but must not retro-bill this cycle as
  // Pro. Falls back to the live tier for any account created before this field.
  const doctorState = await Doctor.findById(doctorId)
    .select("clinicStateCode currentCycleTier tier")
    .lean();
  const tier = doctorState?.currentCycleTier ?? doctorState?.tier ?? "starter";
  const amount = computeCycleCharge(patientCount, tier);
  // Inclusive pricing: `amount` is the gross total; record the GST split (all
  // zero while tax is disabled). IGST vs CGST/SGST from the clinic's state.
  const tax = computeInclusiveTax(amount, {
    interState: isInterStateSupply(doctorState?.clinicStateCode),
  });

  const sponsor = await Sponsor.findOne({ doctorId, paymentResponsibility: "active" }).lean();

  try {
    const invoice = await Invoice.create({
      doctorId,
      cycleNumber: cycle.cycleNumber,
      tier,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      patientCount,
      amount,
      taxRate: tax.rate,
      taxableValue: tax.taxableValue,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      taxInterState: tax.interState,
      status: "pending",
      dueDate: cycle.dueDate,
      graceEndDate: cycle.graceEndDate,
      payer: sponsor ? "sponsor" : "doctor",
      sponsorId: sponsor?._id,
    });
    return { created: true, invoiceId: String(invoice._id) };
  } catch (err) {
    // Race on the unique index → another run created it; treat as not-created.
    const again = await Invoice.findOne({ doctorId, cycleNumber: cycle.cycleNumber }).lean();
    if (again) return { created: false, invoiceId: String(again._id) };
    throw err;
  }
}

/**
 * Mark an invoice paid (idempotent) and resume access if the doctor was paused
 * and has no other still-unpaid invoices. The single place payment success is
 * applied, shared by the in-app verify route and the webhook backstop (§11).
 */
export async function markInvoicePaid(
  invoiceId: Types.ObjectId | string,
  payment: { paymentId?: string; orderId?: string; by?: "doctor" | "sponsor"; adminNote?: string },
): Promise<{ ok: boolean; doctorId?: string }> {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return { ok: false };

  if (invoice.status !== "paid") {
    invoice.status = "paid";
    invoice.paidAt = new Date();
    if (payment.paymentId) invoice.razorpayPaymentId = payment.paymentId;
    if (payment.orderId) invoice.razorpayOrderId = payment.orderId;
    if (payment.by) invoice.payer = payment.by;
    if (payment.adminNote) invoice.adminAdjustmentNote = payment.adminNote;
    await invoice.save();
  }

  // Resume access if this clears the last outstanding invoice.
  const stillUnpaid = await Invoice.countDocuments({
    doctorId: invoice.doctorId,
    status: { $in: ["pending", "overdue"] },
  });
  if (stillUnpaid === 0) {
    await Doctor.updateOne(
      { _id: invoice.doctorId, accountStatus: "paused" },
      { $set: { accountStatus: "active" } },
    );
  }

  return { ok: true, doctorId: String(invoice.doctorId) };
}
