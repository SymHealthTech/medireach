import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { CustomKeyword } from "@/models/CustomKeyword";

/** Delete a custom keyword (spec §9.5). Tenant-scoped by doctorId. */
export const DELETE = route<{ id: string }>(
  { roles: Roles.doctorOnly },
  async (_req, ctx, { id }) => {
    await CustomKeyword.deleteOne({ _id: id, doctorId: requireDoctorId(ctx) });
    return jsonOk({ ok: true });
  },
);
