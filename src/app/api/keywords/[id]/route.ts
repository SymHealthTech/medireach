import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { CustomKeyword } from "@/models/CustomKeyword";

/** Update a custom keyword (spec §9.5). Tenant-scoped by doctorId. */
export const PATCH = route<{ id: string }>(
  { roles: Roles.doctorOnly },
  async (req, ctx, { id }) => {
    const body = await req.json();
    const { keyword, expansion } = body as { keyword?: string; expansion?: string };
    if (!keyword || !expansion) throw Errors.badRequest("keyword and expansion required");
    await CustomKeyword.updateOne(
      { _id: id, doctorId: requireDoctorId(ctx) },
      { $set: { keyword, expansion } },
    );
    return jsonOk({ ok: true });
  },
);

/** Delete a custom keyword (spec §9.5). Tenant-scoped by doctorId. */
export const DELETE = route<{ id: string }>(
  { roles: Roles.doctorOnly },
  async (_req, ctx, { id }) => {
    await CustomKeyword.deleteOne({ _id: id, doctorId: requireDoctorId(ctx) });
    return jsonOk({ ok: true });
  },
);
