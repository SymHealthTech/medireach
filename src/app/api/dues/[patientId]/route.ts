import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFind, scopedFindById } from "@/lib/api/scoped";
import { requireActiveDoctor } from "@/lib/api/account";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { duesActionSchema } from "@/lib/validation/dues";
import { sanitizeAmount, duesStatus } from "@/lib/dues/compute";

/**
 * Per-patient dues detail + settlement (the Patient Dues feature). Doctor-only,
 * tenant-scoped. Clearing dues happens ONLY here: recording a payment reduces
 * the balance and appends a payment-history entry; adjusting corrects a mistyped
 * fee. Separate from MediReach subscription billing.
 */

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

/**
 * GET /api/dues/[patientId] — the patient's total outstanding, the per-visit
 * breakdown (date + fee/paid/due), and the combined payment history newest-first.
 */
export const GET = route<{ patientId: string }>({ roles: Roles.doctorOnly }, async (_req, ctx, { patientId }) => {
  requireDoctorId(ctx);
  if (!OBJECT_ID.test(patientId)) throw Errors.badRequest("Invalid patient id.");

  const patient = await scopedFindById(Patient, ctx, patientId).select("name mobile").lean();
  if (!patient) throw Errors.notFound("Patient not found.");

  // Every visit for this patient that carries a dues record, newest first.
  const visits = await scopedFind(Visit, ctx, { patientId, dues: { $exists: true } })
    .select("dues createdAt confirmedAt diagnosis")
    .sort({ createdAt: -1 })
    .lean();

  const items = visits.map((v) => ({
    visitId: String(v._id),
    date: v.confirmedAt ?? v.createdAt,
    diagnosis: v.diagnosis ?? null,
    feeAmount: v.dues?.feeAmount ?? 0,
    amountPaid: v.dues?.amountPaid ?? 0,
    dueAmount: v.dues?.dueAmount ?? 0,
    status: v.dues?.status ?? "unpaid",
  }));

  const totalOutstanding = items.reduce((sum, it) => sum + it.dueAmount, 0);

  // Flatten every payment across the patient's visits into one history stream.
  const history = visits
    .flatMap((v) =>
      (v.dues?.payments ?? []).map((p) => ({
        visitId: String(v._id),
        amount: p.amount,
        at: p.at,
        note: p.note ?? null,
      })),
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return jsonOk({
    patient: { id: String(patient._id), name: patient.name ?? "", mobile: patient.mobile ?? "" },
    totalOutstanding,
    items,
    history,
  });
});

/**
 * POST /api/dues/[patientId] — settle a due (record a payment) or adjust the fee
 * on one of the patient's visits. The target visit must belong to this patient
 * (and this doctor, via scoping) and must already carry a dues record.
 */
export const POST = route<{ patientId: string }>({ roles: Roles.doctorOnly }, async (req, ctx, { patientId }) => {
  await requireActiveDoctor(ctx);
  if (!OBJECT_ID.test(patientId)) throw Errors.badRequest("Invalid patient id.");
  const data = await parseBody(req, duesActionSchema);

  const visit = await scopedFindById(Visit, ctx, data.visitId);
  if (!visit) throw Errors.notFound("Visit not found.");
  if (String(visit.patientId) !== patientId) throw Errors.badRequest("Visit does not belong to this patient.");
  if (!visit.dues) throw Errors.badRequest("This visit has no dues to update.");

  if (data.action === "settle") {
    const applied = Math.min(sanitizeAmount(data.amount), visit.dues.dueAmount);
    if (applied <= 0) throw Errors.badRequest("Enter an amount up to the outstanding balance.");
    visit.dues.amountPaid += applied;
    visit.dues.dueAmount -= applied;
    visit.dues.status = duesStatus(visit.dues.feeAmount, visit.dues.amountPaid);
    visit.dues.payments.push({ amount: applied, at: new Date(), note: data.note });
    visit.markModified("dues");
    await visit.save();
    await audit(ctx, "dues.settle", { targetType: "Visit", targetId: visit._id, meta: { amount: applied } });
  } else {
    // adjust — correct a mistyped fee; recompute the balance against collected.
    const newFee = sanitizeAmount(data.feeAmount);
    visit.dues.feeAmount = newFee;
    visit.dues.dueAmount = Math.max(newFee - visit.dues.amountPaid, 0);
    visit.dues.status = duesStatus(newFee, visit.dues.amountPaid);
    visit.markModified("dues");
    await visit.save();
    await audit(ctx, "dues.adjust", { targetType: "Visit", targetId: visit._id, meta: { feeAmount: newFee } });
  }

  return jsonOk({
    ok: true,
    dues: {
      feeAmount: visit.dues.feeAmount,
      amountPaid: visit.dues.amountPaid,
      dueAmount: visit.dues.dueAmount,
      status: visit.dues.status,
    },
  });
});
