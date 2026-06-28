import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { scopedFind, scopedFindById, scopedFindOne } from "@/lib/api/scoped";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { startOfTodayIST } from "@/lib/time";

/**
 * Today's queue (spec §7.1). Returns today's visits (tenant-scoped) with just
 * the patient's name + mobile — no clinical fields — so the same shape is safe
 * for both roles. The receptionist renders confirmed entries as disabled,
 * non-clickable rows (§5.2); the `status` field drives that.
 */
export const GET = route({ roles: Roles.clinic }, async (_req, ctx) => {
  const visits = await scopedFind(Visit, ctx, { createdAt: { $gte: startOfTodayIST() } })
    .select({ patientId: 1, type: 1, status: 1, createdAt: 1 })
    .sort({ createdAt: 1 })
    .populate({ path: "patientId", select: "name mobile ageYears gender" })
    .lean();

  const entries = visits.map((v) => {
    const patient = v.patientId as unknown as { _id: unknown; name: string; mobile: string; ageYears?: number; gender?: string } | null;
    return {
      visitId: String(v._id),
      patientId: patient ? String(patient._id) : null,
      name: patient?.name ?? "(removed)",
      mobile: patient?.mobile ?? "",
      ageYears: patient?.ageYears ?? null,
      gender: patient?.gender ?? null,
      type: v.type,
      status: v.status,
      createdAt: v.createdAt,
    };
  });

  return jsonOk({ entries });
});

/**
 * Add an existing patient to today's queue as a follow-up or new entry
 * (spec §7.1). Creates a draft Visit. Optional vitals (bp/weight/height/temp)
 * entered at registration are written to visit.oe so the consult form shows
 * them immediately, and also persisted to the patient record as the latest
 * snapshot. Tenant-scoped lookup ensures the patient belongs to this clinic.
 */
const addSchema = z.object({
  patientId: fields.objectId,
  type: z.enum(["new", "follow-up"]).default("follow-up"),
  bp: z.string().trim().max(20).optional(),
  weightKg: z.number().min(0).max(500).optional(),
  heightCm: z.number().min(0).max(300).optional(),
  temp: z.string().trim().max(20).optional(),
});

export const POST = route({ roles: Roles.clinic }, async (req, ctx) => {
  const { patientId, type, bp, weightKg, heightCm, temp } = await parseBody(req, addSchema);

  const patient = await scopedFindById(Patient, ctx, patientId).select("_id").lean();
  if (!patient) throw Errors.notFound("Patient not found.");

  if (type === "new") {
    const existing = await scopedFindOne(Visit, ctx, {
      patientId,
      type: "new",
      createdAt: { $gte: startOfTodayIST() },
    }).select("_id").lean();
    if (existing) throw Errors.conflict("This patient already has a new entry in today's queue.");
  }

  // Build oe from any vitals captured at registration
  const oe: Record<string, string> = {};
  if (bp) oe.bp = bp;
  if (weightKg != null) oe.weight = `${weightKg} kg`;
  if (heightCm != null) oe.height = `${heightCm} cm`;
  if (temp) oe.temp = temp;

  const visit = await Visit.create({
    doctorId: requireDoctorId(ctx),
    patientId,
    type,
    status: "draft",
    oe,
  });

  // Keep the patient record up-to-date with the latest vitals
  if (Object.keys(oe).length > 0) {
    const patientVitals: Record<string, unknown> = {};
    if (bp) patientVitals.bp = bp;
    if (weightKg != null) patientVitals.weightKg = weightKg;
    if (heightCm != null) patientVitals.heightCm = heightCm;
    if (temp) patientVitals.temp = temp;
    await Patient.updateOne({ _id: patientId }, { $set: patientVitals });
  }

  await audit(ctx, "queue.add", { targetType: "Visit", targetId: visit._id });
  return jsonOk({ visitId: visit._id.toString() }, 201);
});
