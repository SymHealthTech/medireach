import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { startOfDaysAgoIST } from "@/lib/time";

/**
 * The narrow 7-day-list contact-correction exception (spec §5.2, Open Decision
 * §16.1 — confirmed: allow name/number edit only). This is the ONE place a
 * receptionist may touch an already-seen (locked) patient, and strictly limited
 * to name + mobile for callback purposes — never anything clinical, never
 * delete. We re-verify server-side that the patient was actually seen in the
 * last 7 days before permitting the edit.
 */
const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  mobile: fields.mobile.optional(),
});

export const PATCH = route<{ id: string }>({ roles: Roles.clinic }, async (req, ctx, { id }) => {
  const doctorId = requireDoctorId(ctx);
  const data = await parseBody(req, schema);
  if (data.name === undefined && data.mobile === undefined) {
    throw Errors.badRequest("Provide a name or mobile to update.");
  }

  const since = startOfDaysAgoIST(7);
  const seen = await Visit.exists({
    doctorId,
    patientId: id,
    status: "confirmed",
    confirmedAt: { $gte: since },
  });
  if (!seen) throw Errors.forbidden("This patient is not in your recent (7-day) list.");

  const update: Record<string, string> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.mobile !== undefined) update.mobile = data.mobile;
  await Patient.updateOne({ _id: id, doctorId }, { $set: update });

  await audit(ctx, "patient.contact-correct", { targetType: "Patient", targetId: id });
  return jsonOk({ ok: true });
});
