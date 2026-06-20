import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";

/** Remove an emergency contact (spec §10). `id` is the contact doctor's id. */
export const DELETE = route<{ id: string }>(
  { roles: Roles.doctorOnly },
  async (_req, ctx, { id }) => {
    const myId = requireDoctorId(ctx);
    await Doctor.updateOne(
      { _id: myId },
      { $pull: { emergencyContacts: { contactDoctorId: id } } },
    );
    await audit(ctx, "sos.contact.remove", { targetType: "Doctor", targetId: id });
    return jsonOk({ ok: true });
  },
);
