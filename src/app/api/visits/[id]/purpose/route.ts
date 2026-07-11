import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { VISIT_MODES } from "@/lib/constants";

/**
 * Change a queued visit's purpose (visitMode). This is queue metadata, not
 * clinical content, so both clinic roles may set it — the same as choosing the
 * purpose when adding to the queue (§5.2). Allowed only while the visit is still
 * a draft; once confirmed the record is finalized and its purpose is fixed.
 */
const schema = z.object({ visitMode: z.enum(VISIT_MODES) });

export const PATCH = route<{ id: string }>({ roles: Roles.clinic }, async (req, ctx, { id }) => {
  const { visitMode } = await parseBody(req, schema);

  const visit = await scopedFindById(Visit, ctx, id);
  if (!visit) throw Errors.notFound("Visit not found.");
  if (visit.status === "confirmed") {
    throw Errors.forbidden("This visit is already completed — its purpose can't be changed.");
  }

  visit.visitMode = visitMode;
  await visit.save();

  await audit(ctx, "visit.purpose", { targetType: "Visit", targetId: visit._id, meta: { visitMode } });
  return jsonOk({ ok: true });
});
