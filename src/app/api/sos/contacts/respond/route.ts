import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";

/**
 * Respond to an incoming emergency-contact request (spec §10 consent step).
 * The recipient accepts or declines being added; only accepted contacts receive
 * alerts. Accepting flips the requester's entry to "accepted"; declining removes
 * it so it doesn't linger.
 */
const schema = z.object({ fromDoctorId: fields.objectId, accept: z.boolean() });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const myId = requireDoctorId(ctx);
  const { fromDoctorId, accept } = await parseBody(req, schema);

  const requester = await Doctor.findById(fromDoctorId).select("emergencyContacts");
  if (!requester) throw Errors.notFound("Request not found.");

  const entry = requester.emergencyContacts.find(
    (c) => String(c.contactDoctorId) === myId && c.status === "pending",
  );
  if (!entry) throw Errors.notFound("No pending request from this doctor.");

  if (accept) {
    entry.status = "accepted";
  } else {
    requester.emergencyContacts = requester.emergencyContacts.filter(
      (c) => !(String(c.contactDoctorId) === myId && c.status === "pending"),
    );
  }
  await requester.save();

  await audit(ctx, accept ? "sos.contact.accept" : "sos.contact.decline", {
    targetType: "Doctor",
    targetId: fromDoctorId,
  });
  return jsonOk({ ok: true });
});
