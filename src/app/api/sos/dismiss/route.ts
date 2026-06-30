import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { SOSEvent } from "@/models/SOSEvent";

const schema = z.object({ eventId: fields.objectId });

/** Record that the calling doctor dismissed this SOS alert. */
export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const myId = requireDoctorId(ctx);
  const { eventId } = await parseBody(req, schema);

  await SOSEvent.updateOne(
    { _id: eventId, contactsNotified: myId },
    { $addToSet: { dismissedBy: myId } },
  );

  return jsonOk({ ok: true });
});
