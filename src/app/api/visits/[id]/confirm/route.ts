import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { requireActiveDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { visitUpdateSchema } from "@/lib/validation/visit";
import { RECORD } from "@/lib/constants";

/**
 * The Confirm gate (spec §7.4). This is the single safety event that finalizes
 * a visit: nothing is saved as a real record until pressed, and there is no
 * auto-finalization. Confirm accepts the final edited field values, flips the
 * visit draft → confirmed, sets the 3-day edit lock (§9.2), and — per the §5.2
 * implementation note — this same status flip is what locks the receptionist
 * out of the patient for the day. Requires an active subscription (§11).
 */
export const POST = route<{ id: string }>({ roles: Roles.doctorOnly }, async (req, ctx, { id }) => {
  await requireActiveDoctor(ctx);
  const data = await parseBody(req, visitUpdateSchema);

  const visit = await scopedFindById(Visit, ctx, id);
  if (!visit) throw Errors.notFound("Visit not found.");
  if (visit.status === "confirmed") {
    return jsonOk({ ok: true, alreadyConfirmed: true });
  }

  // Persist the final, doctor-reviewed values supplied at confirm time.
  if (data.ho !== undefined) visit.ho = data.ho;
  if (data.fh !== undefined) visit.fh = data.fh;
  if (data.co !== undefined) visit.co = data.co;
  if (data.oe !== undefined) visit.oe = data.oe;
  if (data.procedure !== undefined) visit.procedure = data.procedure;
  if (data.notes !== undefined) visit.notes = data.notes;
  if (data.provisionalDiagnosis !== undefined) visit.provisionalDiagnosis = data.provisionalDiagnosis;
  if (data.diagnosis !== undefined) visit.diagnosis = data.diagnosis;
  if (data.medicines !== undefined) visit.medicines = data.medicines;
  if (data.fees !== undefined) visit.fees = data.fees;
  if (data.reportPublicIds !== undefined) visit.reportPublicIds = data.reportPublicIds;

  const now = new Date();
  visit.status = "confirmed";
  visit.confirmedAt = now;
  visit.editLockAt = new Date(now.getTime() + RECORD.EDIT_LOCK_DAYS * 86_400_000);
  await visit.save();

  await audit(ctx, "visit.confirm", { targetType: "Visit", targetId: visit._id });
  return jsonOk({ ok: true, confirmedAt: now });
});
