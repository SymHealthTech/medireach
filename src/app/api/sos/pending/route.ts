import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Doctor } from "@/models/Doctor";
import { SOSEvent } from "@/models/SOSEvent";
import { doctorDisplayName } from "@/lib/doctorName";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/** Returns recent unresolved SOS events where this doctor is a notified contact. */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const myId = requireDoctorId(ctx);
  const since = new Date(Date.now() - WINDOW_MS);

  const events = await SOSEvent.find({
    contactsNotified: myId,
    triggeredAt: { $gte: since },
    resolved: false,
    dismissedBy: { $ne: myId },
  })
    .select("_id doctorId triggeredAt gpsCoordinate clinicAddress")
    .lean();

  if (!events.length) return jsonOk({ alerts: [] });

  const doctorIds = [...new Set(events.map((e) => String(e.doctorId)))];
  const doctors = await Doctor.find({ _id: { $in: doctorIds } })
    .select("name clinicName")
    .lean();
  const byId = new Map(doctors.map((d) => [String(d._id), d]));

  const alerts = events.map((e) => {
    const doc = byId.get(String(e.doctorId));
    return {
      id: String(e._id),
      title: `🚨 SOS — ${doctorDisplayName(doc?.name) || "Dr. Unknown"} needs help`,
      body: doc?.clinicName ?? "",
      gps: e.gpsCoordinate ?? null,
      clinicAddress: e.clinicAddress,
    };
  });

  return jsonOk({ alerts });
});
