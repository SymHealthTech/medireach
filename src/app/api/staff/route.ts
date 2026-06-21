import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Receptionist } from "@/models/Receptionist";
import { hashPassword } from "@/lib/auth/password";

/**
 * Staff management (spec §12 "Staff") — the doctor adds/manages their single
 * linked receptionist account (§5.2): credentials + reset access. Without this
 * there is no way to provision the receptionist role, so it's essential to the
 * two-role workflow. Doctor-only.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const r = await Receptionist.findOne({ doctorId: requireDoctorId(ctx) }).select("name username mobile active").lean();
  return jsonOk({ receptionist: r ? { name: r.name, username: r.username, mobile: r.mobile ?? null, active: r.active } : null });
});

const schema = z.object({
  name: z.string().trim().min(2),
  username: z.string().trim().min(3).max(40).toLowerCase(),
  mobile: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), fields.mobile.optional()),
  password: fields.password,
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const data = await parseBody(req, schema);

  // Username must be globally unique unless it's this doctor's existing one.
  const clash = await Receptionist.findOne({ username: data.username, doctorId: { $ne: doctorId } }).lean();
  if (clash) throw Errors.conflict("That username is taken. Choose another.");

  const passwordHash = await hashPassword(data.password);
  // Bumping tokenVersion invalidates any session the receptionist currently
  // holds — so a password change (set directly by the doctor) logs her out
  // immediately (Change 1).
  await Receptionist.findOneAndUpdate(
    { doctorId },
    {
      $set: { name: data.name, username: data.username, mobile: data.mobile, passwordHash, active: true },
      $setOnInsert: { doctorId },
      $inc: { tokenVersion: 1 },
    },
    { upsert: true },
  );

  await audit(ctx, "staff.upsert", { targetType: "Receptionist" });
  return jsonOk({ ok: true });
});

/**
 * Delete the receptionist account (Change 1) — e.g. the receptionist leaves.
 * Removing the document immediately invalidates her session: the per-request
 * liveness check in the guard (and the app-shell layout) finds no account.
 */
export const DELETE = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  await Receptionist.deleteOne({ doctorId });
  await audit(ctx, "staff.delete", { targetType: "Receptionist" });
  return jsonOk({ ok: true });
});
