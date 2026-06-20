import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { PushSubscription } from "@/models/PushSubscription";

/**
 * Register a Web Push subscription for the doctor's current device (spec §10).
 * Upserted by endpoint so re-subscribing the same device doesn't duplicate.
 */
const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const sub = await parseBody(req, schema);

  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    { $set: { doctorId, endpoint: sub.endpoint, keys: sub.keys } },
    { upsert: true },
  );
  return jsonOk({ ok: true }, 201);
});
