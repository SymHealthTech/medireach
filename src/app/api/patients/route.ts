import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
import { patientRegistrationSchema } from "@/lib/validation/patient";
import { VISIT_MODES } from "@/lib/constants";

/**
 * Register a new patient (spec §7.2) and enqueue them for the doctor in one
 * step ("On save → patient enters the doctor's queue"). Available to both
 * clinic roles. Registration is intentionally NOT blocked when the subscription
 * is paused (Open Decision §11 default: the receptionist can keep building a
 * queue; it carries no AI/voice cost). A draft Visit is what the receptionist
 * can edit/delete until the doctor confirms (§5.2).
 */
const schema = patientRegistrationSchema.and(
  z.object({
    visitType: z.enum(["new", "follow-up"]).default("new"),
    // Distinct from visitType (new/follow-up): the queue mode (consultation vs.
    // certificate-only fast path).
    visitMode: z.enum(VISIT_MODES).default("consultation"),
  }),
);

export const POST = route({ roles: Roles.clinic }, async (req, ctx) => {
  const data = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);

  const patient = await Patient.create({
    doctorId,
    name: data.name,
    gender: data.gender,
    dob: data.dob ? new Date(data.dob) : undefined,
    ageYears: data.ageYears,
    mobile: data.mobile,
    address: data.address ?? "",
    bp: data.bp,
    weightKg: data.weightKg,
    heightCm: data.heightCm,
    temp: data.temp,
    allergicTo: data.allergicTo,
    referredBy: data.referredBy,
    emergencyContact: data.emergencyContact,
    consentAt: new Date(),
  });

  const oe: Record<string, string> = {};
  if (data.bp) oe.bp = data.bp;
  if (data.weightKg != null) oe.weight = `${data.weightKg} kg`;
  if (data.heightCm != null) oe.height = `${data.heightCm} cm`;
  if (data.temp) oe.temp = data.temp;

  const visit = await Visit.create({
    doctorId,
    patientId: patient._id,
    type: data.visitType,
    visitMode: data.visitMode,
    status: "draft",
    oe,
  });

  await audit(ctx, "patient.register", { targetType: "Patient", targetId: patient._id });

  return jsonOk(
    { patientId: patient._id.toString(), visitId: visit._id.toString() },
    201,
  );
});
