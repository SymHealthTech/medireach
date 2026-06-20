import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";
import { MAX_SOS_CONTACTS } from "@/lib/constants";

/**
 * Emergency-contact management (spec §10). Contacts are other doctors on the
 * app, and each must ACCEPT being added before alerts will reach them (consent).
 * A doctor may have at most 10. GET returns both the doctor's own contact list
 * and any incoming requests awaiting their consent.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const myId = requireDoctorId(ctx);
  const me = await Doctor.findById(myId).select("emergencyContacts").lean();

  const contactIds = (me?.emergencyContacts ?? []).map((c) => c.contactDoctorId);
  const contactDocs = await Doctor.find({ _id: { $in: contactIds } })
    .select("name appId")
    .lean();
  const byId = new Map(contactDocs.map((d) => [String(d._id), d]));

  const contacts = (me?.emergencyContacts ?? []).map((c) => {
    const d = byId.get(String(c.contactDoctorId));
    return {
      doctorId: String(c.contactDoctorId),
      name: d?.name ?? "(unknown)",
      appId: d?.appId ?? "",
      status: c.status,
    };
  });

  // Incoming: doctors who added ME and are awaiting my consent.
  const requesters = await Doctor.find({
    emergencyContacts: { $elemMatch: { contactDoctorId: myId, status: "pending" } },
  })
    .select("name appId")
    .lean();
  const incoming = requesters.map((r) => ({ fromDoctorId: String(r._id), name: r.name, appId: r.appId }));

  return jsonOk({ contacts, incoming, max: MAX_SOS_CONTACTS });
});

/** Add an emergency contact by their MediReach app ID (§10). Creates a pending
 * request the other doctor must accept. */
const addSchema = z.object({ appId: z.string().trim().min(3).max(20) });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const myId = requireDoctorId(ctx);
  const { appId } = await parseBody(req, addSchema);

  const target = await Doctor.findOne({ appId: appId.toUpperCase() }).select("_id accountStatus");
  if (!target) throw Errors.notFound("No doctor found with that MediReach ID.");
  if (String(target._id) === myId) throw Errors.badRequest("You can't add yourself.");

  const me = await Doctor.findById(myId).select("emergencyContacts");
  if (!me) throw Errors.notFound("Account not found.");

  if (me.emergencyContacts.length >= MAX_SOS_CONTACTS) {
    throw Errors.badRequest(`You can have at most ${MAX_SOS_CONTACTS} emergency contacts.`);
  }
  if (me.emergencyContacts.some((c) => String(c.contactDoctorId) === String(target._id))) {
    throw Errors.conflict("That doctor is already in your contacts.");
  }

  me.emergencyContacts.push({ contactDoctorId: target._id, status: "pending", addedAt: new Date() });
  await me.save();

  await audit(ctx, "sos.contact.add", { targetType: "Doctor", targetId: target._id });
  return jsonOk({ ok: true }, 201);
});
