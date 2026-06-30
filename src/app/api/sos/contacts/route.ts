import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";
import { MAX_SOS_CONTACTS } from "@/lib/constants";

const MOBILE_RE = /^\+?\d{7,15}$/;

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
    };
  });

  return jsonOk({ contacts, max: MAX_SOS_CONTACTS });
});

const addSchema = z.object({ query: z.string().trim().min(3).max(20) });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const myId = requireDoctorId(ctx);
  const { query } = await parseBody(req, addSchema);

  const isMobile = MOBILE_RE.test(query);
  const target = isMobile
    ? await Doctor.findOne({ mobile: query }).select("_id name")
    : await Doctor.findOne({ appId: query.toUpperCase() }).select("_id name");

  if (!target) {
    throw Errors.notFound(
      isMobile
        ? "No MediReach user found with that mobile number."
        : "No doctor found with that MediReach ID.",
    );
  }
  if (String(target._id) === myId) throw Errors.badRequest("You can't add yourself.");

  const me = await Doctor.findById(myId).select("emergencyContacts");
  if (!me) throw Errors.notFound("Account not found.");

  if (me.emergencyContacts.length >= MAX_SOS_CONTACTS) {
    throw Errors.badRequest(`You can have at most ${MAX_SOS_CONTACTS} emergency contacts.`);
  }
  if (me.emergencyContacts.some((c) => String(c.contactDoctorId) === String(target._id))) {
    throw Errors.conflict("That doctor is already in your contacts.");
  }

  me.emergencyContacts.push({ contactDoctorId: target._id, status: "accepted", addedAt: new Date() });
  await me.save();

  await audit(ctx, "sos.contact.add", { targetType: "Doctor", targetId: target._id });
  return jsonOk({ ok: true, name: target.name }, 201);
});
