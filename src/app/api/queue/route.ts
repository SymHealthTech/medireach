import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { scopedFind, scopedFindById } from "@/lib/api/scoped";
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
    .populate({ path: "patientId", select: "name mobile" })
    .lean();

  const entries = visits.map((v) => {
    const patient = v.patientId as unknown as { _id: unknown; name: string; mobile: string } | null;
    return {
      visitId: String(v._id),
      patientId: patient ? String(patient._id) : null,
      name: patient?.name ?? "(removed)",
      mobile: patient?.mobile ?? "",
      type: v.type,
      status: v.status,
      createdAt: v.createdAt,
    };
  });

  return jsonOk({ entries });
});

/**
 * Add an existing patient to today's queue as a follow-up or new entry
 * (spec §7.1). Creates a draft Visit. Tenant-scoped lookup ensures the patient
 * belongs to this clinic.
 */
const addSchema = z.object({
  patientId: fields.objectId,
  type: z.enum(["new", "follow-up"]).default("follow-up"),
});

export const POST = route({ roles: Roles.clinic }, async (req, ctx) => {
  const { patientId, type } = await parseBody(req, addSchema);

  const patient = await scopedFindById(Patient, ctx, patientId).select("_id").lean();
  if (!patient) throw Errors.notFound("Patient not found.");

  const visit = await Visit.create({
    doctorId: requireDoctorId(ctx),
    patientId,
    type,
    status: "draft",
  });

  await audit(ctx, "queue.add", { targetType: "Visit", targetId: visit._id });
  return jsonOk({ visitId: visit._id.toString() }, 201);
});
