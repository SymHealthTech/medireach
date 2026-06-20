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

/**
 * Trigger an SOS alert (spec §10; Change 4). The client enforces the brief
 * cancel window BEFORE calling this, so reaching here means the alert is
 * committed. Alerts go out as VAPID web push ONLY — no SMS — to every accepted
 * contact (all guaranteed app users with push subscriptions). The push is
 * high-priority (urgency:high) with a fixed topic so repeated triggers replace
 * rather than stack, and carries the GPS coordinate in the data payload for a
 * future map deep-link. Works regardless of billing status — safety is never
 * gated behind payment.
 */
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

  // Accepted contacts only (consent, §10) — all are existing app users.
  const acceptedIds = me.emergencyContacts
    .filter((c) => c.status === "accepted")
    .map((c) => c.contactDoctorId);
  const contacts = await Doctor.find({ _id: { $in: acceptedIds } }).select("_id").lean();

  const title = `🚨 SOS — Dr. ${me.name} needs help`;
  const body = `${me.clinicName || "Clinic"}${me.clinicAddress ? ` — ${me.clinicAddress}` : ""}. ${locationLine}`;

  // Deliver a high-priority push to each contact; record per-recipient status.
  const pushDeliveryStatus = await Promise.all(
    contacts.map(async (c) => {
      const sent = await pushToDoctor(String(c._id), {
        title,
        body,
        urgent: true,
        topic: "medireach-sos",
        url: "/app",
        data: { gps: gps ?? null, clinicAddress: me.clinicAddress ?? "", url: "/app" },
      });
      return { doctorId: c._id, delivered: sent > 0 };
    }),
  );

  const event = await SOSEvent.create({
    doctorId: myId,
    triggeredAt: new Date(),
    cancelledAt: null,
    gpsCoordinate: gps,
    clinicAddress: me.clinicAddress ?? "",
    contactsNotified: acceptedIds,
    pushDeliveryStatus,
    resolved: false,
  });

  await audit(ctx, "sos.trigger", { targetType: "SOSEvent", targetId: event._id, meta: { contacts: contacts.length } });
  return jsonOk({ ok: true, eventId: event._id.toString(), notified: contacts.length });
});
