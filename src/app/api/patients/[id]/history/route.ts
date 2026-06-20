import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { scopedFindById } from "@/lib/api/scoped";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
import { requireDoctorId } from "@/lib/api/context";
import { startOfDaysAgoIST } from "@/lib/time";
import { RECORD } from "@/lib/constants";

/**
 * Patient visit history, up to 1 year back (spec §9.1). Doctor-only — the
 * receptionist never sees visit history (§5.2). Used for the follow-up "view
 * last visit summary" flow (§7.1) and the Patient Records view.
 */
export const GET = route<{ id: string }>({ roles: Roles.doctorOnly }, async (_req, ctx, { id }) => {
  const patient = await scopedFindById(Patient, ctx, id).lean();
  if (!patient) throw Errors.notFound("Patient not found.");

  const since = startOfDaysAgoIST(RECORD.RETENTION_DAYS);
  const visits = await Visit.find({
    doctorId: requireDoctorId(ctx),
    patientId: id,
    status: "confirmed",
    confirmedAt: { $gte: since },
  })
    .sort({ confirmedAt: -1 })
    .lean();

  return jsonOk({ patient, visits });
});
