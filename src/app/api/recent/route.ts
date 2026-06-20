import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { startOfDaysAgoIST } from "@/lib/time";

/**
 * Receptionist's "Recent Patients" — last 7 days, already-seen patients
 * (spec §5.2). Name + mobile ONLY, no drill-down, no clinical content. Derived
 * from confirmed visits in the window. Names are not clickable in the UI; the
 * sole permitted edit is a contact correction (see /api/recent/[id]).
 */
export const GET = route({ roles: Roles.clinic }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const since = startOfDaysAgoIST(7);

  const visits = await Visit.find({ doctorId, status: "confirmed", confirmedAt: { $gte: since } })
    .select("patientId confirmedAt")
    .sort({ confirmedAt: -1 })
    .lean();

  // Unique patients, most-recent first.
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const v of visits) {
    const pid = String(v.patientId);
    if (!seen.has(pid)) {
      seen.add(pid);
      orderedIds.push(pid);
    }
  }

  const patients = await Patient.find({ _id: { $in: orderedIds }, doctorId })
    .select("name mobile")
    .lean();
  const byId = new Map(patients.map((p) => [String(p._id), p]));

  const list = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: String(p._id), name: p.name, mobile: p.mobile }));

  return jsonOk({ patients: list });
});
