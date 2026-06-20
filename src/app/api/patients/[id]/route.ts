import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { audit } from "@/lib/api/audit";
import { Patient } from "@/models/Patient";
import { RECEPTIONIST_PATIENT_FIELDS } from "@/lib/api/projections";
import { assertReceptionistMayModify } from "@/lib/services/receptionist";

/**
 * Patient detail + edit (spec §5.2, §7.2). Role-projected: the receptionist
 * only ever receives demographics, never vitals or clinical history (§16.2).
 */
export const GET = route<{ id: string }>({ roles: Roles.clinic }, async (_req, ctx, { id }) => {
  const projection = ctx.role === "receptionist" ? RECEPTIONIST_PATIENT_FIELDS : undefined;
  const query = scopedFindById(Patient, ctx, id);
  if (projection) query.select(projection);
  const patient = await query.lean();
  if (!patient) throw Errors.notFound("Patient not found.");
  return jsonOk({ patient });
});

/**
 * Edit demographics. Doctor: any time. Receptionist: only while the patient is
 * still pending today (before the doctor confirms the exam, §5.2) — enforced by
 * assertReceptionistMayModify, and limited to registration fields (never
 * clinical, which patients don't carry anyway).
 */
const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().datetime().optional(),
  ageYears: z.number().int().min(0).max(130).optional(),
  mobile: fields.mobile.optional(),
  address: z.string().trim().max(500).optional(),
  bp: z.string().trim().max(20).optional(),
  weightKg: z.number().min(0).max(500).optional(),
  heightCm: z.number().min(0).max(300).optional(),
  allergicTo: z.string().trim().max(300).optional(),
  referredBy: z.string().trim().max(200).optional(),
  emergencyContact: z.string().trim().max(60).optional(),
});

export const PATCH = route<{ id: string }>({ roles: Roles.clinic }, async (req, ctx, { id }) => {
  if (ctx.role === "receptionist") {
    await assertReceptionistMayModify(ctx, id);
  }

  const data = await parseBody(req, updateSchema);
  const patient = await scopedFindById(Patient, ctx, id);
  if (!patient) throw Errors.notFound("Patient not found.");

  if (data.name !== undefined) patient.name = data.name;
  if (data.gender !== undefined) patient.gender = data.gender;
  if (data.dob !== undefined) patient.dob = new Date(data.dob);
  if (data.ageYears !== undefined) patient.ageYears = data.ageYears;
  if (data.mobile !== undefined) patient.mobile = data.mobile;
  if (data.address !== undefined) patient.address = data.address;
  if (data.bp !== undefined) patient.bp = data.bp;
  if (data.weightKg !== undefined) patient.weightKg = data.weightKg;
  if (data.heightCm !== undefined) patient.heightCm = data.heightCm;
  if (data.allergicTo !== undefined) patient.allergicTo = data.allergicTo;
  if (data.referredBy !== undefined) patient.referredBy = data.referredBy;
  if (data.emergencyContact !== undefined) patient.emergencyContact = data.emergencyContact;
  await patient.save();

  await audit(ctx, "patient.update", { targetType: "Patient", targetId: patient._id });
  return jsonOk({ ok: true });
});
