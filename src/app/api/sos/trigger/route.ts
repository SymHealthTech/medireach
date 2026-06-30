import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";
import { SOSEvent } from "@/models/SOSEvent";
import { pushToDoctor } from "@/lib/integrations/push";

const schema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const myId = requireDoctorId(ctx);
  const { lat, lng } = await parseBody(req, schema);
  const me = await loadDoctor(ctx);

  const hasGps = typeof lat === "number" && typeof lng === "number";
  const gps = hasGps ? { lat, lng } : undefined;
  const locationLine = hasGps
    ? `Location: https://maps.google.com/?q=${lat},${lng}`
    : me.clinicAddress || "Location unavailable";

  const allContactIds = me.emergencyContacts.map((c) => c.contactDoctorId);
  const contacts = await Doctor.find({ _id: { $in: allContactIds } }).select("_id").lean();

  const title = `🚨 SOS — Dr. ${me.name} needs help`;
  const body = `${me.clinicName || "Clinic"}${me.clinicAddress ? ` — ${me.clinicAddress}` : ""}. ${locationLine}`;

  // Create the event first so its ID can be embedded in the push payload,
  // allowing recipients to fetch details via /api/sos/pending when they open the app.
  const event = await SOSEvent.create({
    doctorId: myId,
    triggeredAt: new Date(),
    cancelledAt: null,
    gpsCoordinate: gps,
    clinicAddress: me.clinicAddress ?? "",
    contactsNotified: allContactIds,
    pushDeliveryStatus: [],
    resolved: false,
  });

  const eventId = event._id.toString();

  const pushDeliveryStatus = await Promise.all(
    contacts.map(async (c) => {
      const sent = await pushToDoctor(String(c._id), {
        title,
        body,
        urgent: true,
        topic: "medireach-sos",
        url: "/app",
        data: { eventId, gps: gps ?? null, clinicAddress: me.clinicAddress ?? "", url: "/app" },
      });
      return { doctorId: c._id, delivered: sent > 0 };
    }),
  );

  event.pushDeliveryStatus = pushDeliveryStatus;
  await event.save();

  await audit(ctx, "sos.trigger", { targetType: "SOSEvent", targetId: event._id, meta: { contacts: contacts.length } });
  return jsonOk({ ok: true, eventId, notified: contacts.length });
});
