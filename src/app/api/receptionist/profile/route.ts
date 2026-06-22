import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { loadDoctor } from "@/lib/api/account";
import { Receptionist } from "@/models/Receptionist";

/** Returns the receptionist's own identity + clinic name for the menu card. */
export const GET = route({ roles: Roles.receptionistOnly }, async (_req, ctx) => {
  const [receptionist, doctor] = await Promise.all([
    Receptionist.findById(ctx.userId).select("username name").lean(),
    loadDoctor(ctx),
  ]);

  return jsonOk({
    name: ctx.name,
    username: receptionist?.username ?? "",
    clinicName: doctor.clinicName ?? "",
  });
});
