import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFind, scopedFindById } from "@/lib/api/scoped";
import { requireActiveDoctor } from "@/lib/api/account";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { duesCaptureSchema } from "@/lib/validation/dues";
import { buildInitialDues } from "@/lib/dues/compute";

/**
 * Patient Dues — the clinic's own outstanding-fee bookkeeping (the Patient Dues
 * feature). Doctor-only, tenant-scoped: a doctor only ever sees/records dues for
 * their own patients (§13, §5.2 enforced here server-side). COMPLETELY SEPARATE
 * from MediReach subscription billing.
 */

/**
 * POST /api/dues — capture payment for a visit at the post-prescription moment.
 * The fee is read from the confirmed visit (server-trusted, never from the
 * client); only the collected amount is accepted. Whatever is unpaid is recorded
 * as the outstanding due. Idempotent-ish: re-capturing overwrites the initial
 * dues snapshot (the modal is the only caller and only fires once per visit).
 */
export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  await requireActiveDoctor(ctx);
  const { visitId, amountPaid } = await parseBody(req, duesCaptureSchema);

  const visit = await scopedFindById(Visit, ctx, visitId);
  if (!visit) throw Errors.notFound("Visit not found.");

  const fee = visit.fees ?? 0;
  // No fee charged → nothing to track. Leave dues unset.
  if (fee <= 0) return jsonOk({ ok: true, dues: null });

  visit.dues = buildInitialDues(fee, amountPaid);
  await visit.save();

  await audit(ctx, "dues.capture", {
    targetType: "Visit",
    targetId: visit._id,
    meta: { fee, amountPaid: visit.dues.amountPaid, due: visit.dues.dueAmount },
  });
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

/**
 * GET /api/dues — the outstanding-dues list, one row per patient with a running
 * total, most-recent-first. `q` filters by patient name with forgiving
 * word-start matching ("ram" → "Ramesh"). Doctor-only, tenant-scoped.
 */
const listQuery = z.object({ q: z.string().trim().max(120).optional() });

export const GET = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  requireDoctorId(ctx);
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) throw Errors.badRequest("Invalid search parameters.");
  const q = parsed.data.q?.trim() ?? "";

  // Every visit that still owes money, newest first.
  const visits = await scopedFind(Visit, ctx, { "dues.dueAmount": { $gt: 0 } })
    .select("patientId dues.dueAmount createdAt confirmedAt")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  // Roll up per patient: running total + most recent due date + visit count.
  const byPatient = new Map<string, { total: number; latest: Date; count: number }>();
  for (const v of visits) {
    const pid = String(v.patientId);
    const due = v.dues?.dueAmount ?? 0;
    const when = new Date(v.confirmedAt ?? v.createdAt);
    const cur = byPatient.get(pid);
    if (cur) {
      cur.total += due;
      cur.count += 1;
      if (when > cur.latest) cur.latest = when;
    } else {
      byPatient.set(pid, { total: due, latest: when, count: 1 });
    }
  }

  if (byPatient.size === 0) return jsonOk({ dues: [] });

  // Resolve names for the patients that owe (tenant-scoped).
  const ids = [...byPatient.keys()];
  const patients = await scopedFind(Patient, ctx, { _id: { $in: ids } })
    .select("name")
    .lean();
  const nameById = new Map(patients.map((p) => [String(p._id), p.name ?? ""]));

  const matches = matcher(q);
  const rows = [...byPatient.entries()]
    .map(([patientId, agg]) => ({
      patientId,
      patientName: nameById.get(patientId) ?? "",
      totalOutstanding: agg.total,
      visitCount: agg.count,
      latestDate: agg.latest,
    }))
    // Skip patients whose row was already purged; then apply the name search.
    .filter((r) => (nameById.has(r.patientId)) && matches(r.patientName))
    .sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());

  return jsonOk({ dues: rows });
});

/**
 * A forgiving name matcher for the search box: empty query matches everything;
 * otherwise the query must appear at the start of the name or any word in it
 * (case-insensitive), so "ram" matches "Ramesh" and "Sita Ram".
 */
function matcher(q: string): (name: string) => boolean {
  if (!q) return () => true;
  const needle = q.toLowerCase();
  return (name: string) => {
    const n = name.toLowerCase();
    if (n.startsWith(needle)) return true;
    return n.split(/\s+/).some((w) => w.startsWith(needle));
  };
}
