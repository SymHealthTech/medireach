import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDateStr(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Doctor-only day-grouped patient records (spec §9.1). Returns every date that
 * had at least one confirmed visit, plus today even if empty, sorted most-recent
 * first. Each patient entry includes isEditLocked (RECORD.EDIT_LOCK_DAYS = 3).
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const todayStr = toISTDateStr(new Date());

  const visits = await Visit.find({ doctorId, status: "confirmed" })
    .select("patientId confirmedAt editLockAt")
    .sort({ confirmedAt: -1 })
    .lean();

  // byDate: dateStr → Map<patientId, { visitId, editLockAt }>
  // One entry per patient per day (most-recent visit wins, already sorted desc).
  const byDate = new Map<string, Map<string, { visitId: string; editLockAt?: Date }>>();
  byDate.set(todayStr, new Map()); // always show today

  for (const v of visits) {
    if (!v.confirmedAt) continue;
    const ds = toISTDateStr(v.confirmedAt);
    if (!byDate.has(ds)) byDate.set(ds, new Map());
    const pid = String(v.patientId);
    if (!byDate.get(ds)!.has(pid)) {
      byDate.get(ds)!.set(pid, { visitId: String(v._id), editLockAt: v.editLockAt });
    }
  }

  const allIds = [...new Set([...byDate.values()].flatMap((m) => [...m.keys()]))];
  const patients = await Patient.find({ _id: { $in: allIds }, doctorId })
    .select("name mobile")
    .lean();
  const pm = new Map(patients.map((p) => [String(p._id), p]));

  const now = Date.now();
  const dates = [...byDate.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const entries = [...byDate.get(date)!.entries()];
      const patientList = entries.flatMap(([pid, e]) => {
        const p = pm.get(pid);
        if (!p) return [];
        return [{
          id: pid,
          visitId: e.visitId,
          name: p.name,
          mobile: p.mobile,
          isEditLocked: !!e.editLockAt && now > e.editLockAt.getTime(),
        }];
      });
      return { date, patientCount: patientList.length, patients: patientList };
    });

  return jsonOk({ dates });
});
