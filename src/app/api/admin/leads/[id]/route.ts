import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { audit } from "@/lib/api/audit";
import { Lead } from "@/models/Lead";
import { LEAD_STATUSES } from "@/lib/constants";

/** Update a lead's status / notes through the sales pipeline (spec §6.5). */
const schema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const POST = route<{ id: string }>({ roles: Roles.adminOnly }, async (req, ctx, { id }) => {
  const data = await parseBody(req, schema);
  await Lead.updateOne({ _id: id }, { $set: data });
  await audit(ctx, "admin.lead.update", { targetType: "Lead", targetId: id, meta: data });
  return jsonOk({ ok: true });
});
