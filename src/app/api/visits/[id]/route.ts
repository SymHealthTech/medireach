import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { requireActiveDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { visitUpdateSchema } from "@/lib/validation/visit";

/**
 * Visit detail + update (spec §7.3, §7.4, §9.2). Doctor-only — the receptionist
 * never sees clinical content (§5.2). GET returns the full visit plus the
 * patient demographics needed to render the consultation header.
 */
export const GET = route<{ id: string }>({ roles: Roles.doctorOnly }, async (_req, ctx, { id }) => {
  const visit = await scopedFindById(Visit, ctx, id).lean();
  if (!visit) throw Errors.notFound("Visit not found.");
  const patient = await scopedFindById(Patient, ctx, String(visit.patientId)).lean();
  return jsonOk({ visit, patient });
});

/**
 * Update clinical fields. Allowed while the visit is a draft, or — once
 * confirmed — only within the 3-day edit window (§9.2); after that the record
 * is immutable. Requires an active (non-paused) subscription (§11).
 */
export const PATCH = route<{ id: string }>({ roles: Roles.doctorOnly }, async (req, ctx, { id }) => {
  await requireActiveDoctor(ctx);
  const data = await parseBody(req, visitUpdateSchema);

  const visit = await scopedFindById(Visit, ctx, id);
  if (!visit) throw Errors.notFound("Visit not found.");

  if (visit.status === "confirmed" && visit.editLockAt && Date.now() > visit.editLockAt.getTime()) {
    throw Errors.forbidden("This record is locked — the 3-day edit window has passed.");
  }

  if (data.ho !== undefined) visit.ho = data.ho;
  if (data.fh !== undefined) visit.fh = data.fh;
  if (data.co !== undefined) visit.co = data.co;
  if (data.oe !== undefined) visit.oe = data.oe;
  if (data.procedure !== undefined) visit.procedure = data.procedure;
  if (data.notes !== undefined) visit.notes = data.notes;
  if (data.provisionalDiagnosis !== undefined) visit.provisionalDiagnosis = data.provisionalDiagnosis;
  if (data.diagnosis !== undefined) visit.diagnosis = data.diagnosis;
  if (data.followUp !== undefined) visit.followUp = data.followUp;
  if (data.adviceGeneral !== undefined) visit.adviceGeneral = data.adviceGeneral;
  if (data.adviceLabTest !== undefined) visit.adviceLabTest = data.adviceLabTest;
  if (data.prescriptionLanguage !== undefined) visit.prescriptionLanguage = data.prescriptionLanguage;
  if (data.medicines !== undefined) visit.medicines = data.medicines;
  if (data.fees !== undefined) visit.fees = data.fees;
  if (data.reportPublicIds !== undefined) visit.reportPublicIds = data.reportPublicIds;
  await visit.save();

  await audit(ctx, "visit.update", { targetType: "Visit", targetId: visit._id });
  return jsonOk({ ok: true });
});

/**
 * Remove a draft queue entry. Doctor can remove any draft; this is also the
 * endpoint the receptionist uses to delete a mistaken pending registration
 * (§5.2 — only while pending). A confirmed visit can never be deleted here
 * (medico-legal integrity, §9.2). If the patient was registered for this visit
 * only and has no other visits, the patient row is cleaned up too.
 */
export const DELETE = route<{ id: string }>({ roles: Roles.clinic }, async (_req, ctx, { id }) => {
  const visit = await scopedFindById(Visit, ctx, id);
  if (!visit) throw Errors.notFound("Visit not found.");
  if (visit.status === "confirmed") {
    throw Errors.forbidden("A completed visit cannot be deleted.");
  }

  const patientId = visit.patientId;
  await visit.deleteOne();

  const remaining = await Visit.countDocuments({ doctorId: ctx.doctorId, patientId });
  if (remaining === 0) {
    // Brand-new mistaken registration with no history → remove the patient too.
    await Patient.deleteOne({ _id: patientId, doctorId: ctx.doctorId });
  }

  await audit(ctx, "queue.remove", { targetType: "Visit", targetId: id });
  return jsonOk({ ok: true });
});
