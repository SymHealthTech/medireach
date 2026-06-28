import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { startOfDaysAgoIST } from "@/lib/time";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function toISTDateStr(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Receptionist's "Recent Patients" — last 7 days, confirmed visits only
 * (spec §5.2). Returns name + mobile + lastVisitDate (IST). No clinical content,
 * no drill-down. The sole permitted edit is a contact correction (see /api/recent/[id]).
 */
export const GET = route({ roles: Roles.clinic }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const since = startOfDaysAgoIST(7);

  const visits = await Visit.find({ doctorId, status: "confirmed", confirmedAt: { $gte: since } })
    .select("patientId confirmedAt")
    .sort({ confirmedAt: -1 })
    .lean();

  // Unique patients, most-recent first, capturing their last visit date.
  const seen = new Map<string, string>(); // patientId → IST date string
  const orderedIds: string[] = [];
  for (const v of visits) {
    const pid = String(v.patientId);
    if (!seen.has(pid)) {
      seen.set(pid, v.confirmedAt ? toISTDateStr(v.confirmedAt) : toISTDateStr(new Date()));
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
    .map((p) => ({
      id: String(p._id),
      name: p.name,
      mobile: p.mobile,
      lastVisitDate: seen.get(String(p._id)) ?? toISTDateStr(new Date()),
    }));

  return jsonOk({ patients: list });
});
