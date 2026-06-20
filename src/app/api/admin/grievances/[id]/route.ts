import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { audit } from "@/lib/api/audit";
import { Grievance } from "@/models/Grievance";

/** Update a grievance's status / resolution note (spec §6.4). */
const schema = z.object({
  status: z.enum(["open", "in-progress", "resolved"]),
  resolutionNote: z.string().trim().max(1000).optional(),
});

export const POST = route<{ id: string }>({ roles: Roles.adminOnly }, async (req, ctx, { id }) => {
  const data = await parseBody(req, schema);
  await Grievance.updateOne({ _id: id }, { $set: data });
  await audit(ctx, "admin.grievance.update", { targetType: "Grievance", targetId: id, meta: data });
  return jsonOk({ ok: true });
});
