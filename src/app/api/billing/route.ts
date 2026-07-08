import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { Invoice } from "@/models/Invoice";
import { Visit } from "@/models/Visit";
import { Sponsor } from "@/models/Sponsor";
import { currentCycle } from "@/lib/billing/cycle";
import { computeCycleCharge } from "@/lib/billing/charge";
import { computeInclusiveTax, isInterStateSupply } from "@/lib/billing/tax";
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
  // Exclude certificate-only visits from the billable count (they use no AI/voice
  // and cost nothing) — consistent with the invoice generator. `$ne` also keeps
  // legacy visits without the field counted as consultations.
  const patientCountSoFar = await Visit.countDocuments({
    doctorId,
    status: "confirmed",
    visitMode: { $ne: "certificate_only" },
    confirmedAt: { $gte: cycle.periodStart, $lt: cycle.periodEnd },
  });

  const invoices = await Invoice.find({ doctorId }).sort({ cycleNumber: -1 }).limit(24).lean();

  const sponsor = await Sponsor.findOne({ doctorId, paymentResponsibility: "active" }).lean();
  const interState = isInterStateSupply(doctor.clinicStateCode);

  // The in-progress cycle is billed at currentCycleTier (the snapshot), so an
  // immediate upgrade still shows this cycle as Starter (₹499) while voice is
  // already unlocked — Pro per-patient billing shows from the next cycle.
  const cycleTier = doctor.currentCycleTier ?? doctor.tier;
  const projectedCharge = computeCycleCharge(patientCountSoFar, cycleTier);

  return jsonOk({
    accountStatus: doctor.accountStatus,
    tier: doctor.tier, // live access tier (drives voice/AI availability)
    currentCycleTier: cycleTier, // tier the in-progress cycle bills at
    tierChangePending: doctor.tierChangePending
      ? {
          toTier: doctor.tierChangePending.toTier,
          effectiveAtCycleStart: doctor.tierChangePending.effectiveAtCycleStart,
        }
      : null,
    clinic: {
      doctorName: doctor.name,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      appId: doctor.appId,
      mobile: doctor.mobile,
      email: doctor.email,
    },
    plan: {
      starterFlat: BILLING.STARTER_FLAT_INR,
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
      projectedCharge,
      payer: sponsor ? "sponsor" : "doctor",
      tax: computeInclusiveTax(projectedCharge, { interState }),
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
      // Computed from the (inclusive) amount so the split reflects current config;
      // matches the stored breakup while the rate is unchanged.
      tax: computeInclusiveTax(i.amount, { interState: i.taxInterState ?? true }),
    })),
  });
});
