import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { audit } from "@/lib/api/audit";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
import { RECEPTIONIST_PATIENT_FIELDS } from "@/lib/api/projections";
import { assertReceptionistMayModify } from "@/lib/services/receptionist";
import { startOfTodayIST } from "@/lib/time";

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
  temp: z.string().trim().max(20).optional(),
  allergicTo: z.string().trim().max(300).optional(),
  referredBy: z.string().trim().max(200).optional(),
  emergencyContact: z.string().trim().max(60).optional(),
});

export const PATCH = route<{ id: string }>({ roles: Roles.clinic }, async (req, ctx, { id }) => {
  if (ctx.role === "receptionist") {
    await assertReceptionistMayModify(ctx, id);
  }

  // Doctor edit lock: the most recent confirmed visit sets editLockAt = confirmedAt + 3 days.
  // After that window the record is read-only from the records view (spec §9.2).
  // The lock protects HISTORICAL records only — while a visit is in progress (a
  // draft in today's queue, e.g. a returning patient being seen now) the doctor
  // must still be able to correct the patient's details, so skip the lock when an
  // active draft visit exists.
  if (ctx.role === "doctor") {
    const activeDraft = await Visit.exists({ patientId: id, doctorId: ctx.doctorId, status: "draft" });
    if (!activeDraft) {
      const latestVisit = await Visit.findOne(
        { patientId: id, doctorId: ctx.doctorId, status: "confirmed" },
        { editLockAt: 1 },
      ).sort({ confirmedAt: -1 }).lean();
      if (latestVisit?.editLockAt && Date.now() > latestVisit.editLockAt.getTime()) {
        throw Errors.forbidden("This record is locked. Patient records can only be edited within 3 days of the visit.");
      }
    }
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
  if (data.temp !== undefined) patient.temp = data.temp;
  if (data.allergicTo !== undefined) patient.allergicTo = data.allergicTo;
  if (data.referredBy !== undefined) patient.referredBy = data.referredBy;
  if (data.emergencyContact !== undefined) patient.emergencyContact = data.emergencyContact;
  await patient.save();

  // Keep today's draft visit.oe in sync so the consult page OE fields reflect
  // any vitals the receptionist just entered or corrected in the queue edit form.
  // Only runs when at least one vital was part of this request.
  const vitalsInRequest =
    data.bp !== undefined || data.weightKg !== undefined ||
    data.heightCm !== undefined || data.temp !== undefined;
  if (vitalsInRequest) {
    const oeSet: Record<string, string> = {};
    const oeUnset: Record<string, 1> = {};
    if (data.bp !== undefined) {
      if (data.bp) oeSet["oe.bp"] = data.bp;
      else oeUnset["oe.bp"] = 1;
    }
    if (data.weightKg !== undefined) oeSet["oe.weight"] = `${data.weightKg} kg`;
    if (data.heightCm !== undefined) oeSet["oe.height"] = `${data.heightCm} cm`;
    if (data.temp !== undefined) {
      if (data.temp) oeSet["oe.temp"] = data.temp;
      else oeUnset["oe.temp"] = 1;
    }
    const mongoOp: Record<string, unknown> = {};
    if (Object.keys(oeSet).length) mongoOp.$set = oeSet;
    if (Object.keys(oeUnset).length) mongoOp.$unset = oeUnset;
    if (Object.keys(mongoOp).length) {
      await Visit.updateOne(
        {
          patientId: patient._id,
          doctorId: patient.doctorId,
          status: "draft",
          createdAt: { $gte: startOfTodayIST() },
        },
        mongoOp,
      );
    }
  }

  await audit(ctx, "patient.update", { targetType: "Patient", targetId: patient._id });
  return jsonOk({ ok: true });
});
