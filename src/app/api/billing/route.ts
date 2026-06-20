import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { Invoice } from "@/models/Invoice";
import { Visit } from "@/models/Visit";
import { currentCycle } from "@/lib/billing/cycle";
import { computeCycleCharge } from "@/lib/billing/charge";
import { BILLING } from "@/lib/constants";

/**
 * Billing summary for the doctor's Billing screen (spec §12). Shows the current
 * plan/status, the live patient count + projected charge for the in-progress
 * cycle, the next billing date, and full invoice history.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctor = await loadDoctor(ctx);
  if (!doctor.cycleStartDate) throw Errors.badRequest("Billing not started.");
  const doctorId = requireDoctorId(ctx);

  const cycle = currentCycle(doctor.cycleStartDate);
  const patientCountSoFar = await Visit.countDocuments({
    doctorId,
    status: "confirmed",
    confirmedAt: { $gte: cycle.periodStart, $lt: cycle.periodEnd },
  });

  const invoices = await Invoice.find({ doctorId }).sort({ cycleNumber: -1 }).limit(24).lean();

  return jsonOk({
    accountStatus: doctor.accountStatus,
    plan: {
      monthlyMinimum: BILLING.MONTHLY_MINIMUM_INR,
      perPatient: BILLING.PER_PATIENT_INR,
      perPatientDiscounted: BILLING.PER_PATIENT_DISCOUNTED_INR,
      discountThreshold: BILLING.DISCOUNT_THRESHOLD,
    },
    currentCycle: {
      cycleNumber: cycle.cycleNumber,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      patientCountSoFar,
      projectedCharge: computeCycleCharge(patientCountSoFar),
    },
    invoices: invoices.map((i) => ({
      id: String(i._id),
      cycleNumber: i.cycleNumber,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
      patientCount: i.patientCount,
      amount: i.amount,
      status: i.status,
      dueDate: i.dueDate,
      graceEndDate: i.graceEndDate,
      payer: i.payer,
    })),
  });
});
