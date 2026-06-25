import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { MedicineOptions } from "@/models/MedicineOptions";

const CATEGORIES = ["types", "doses", "frequencies", "timings"] as const;
type Category = (typeof CATEGORIES)[number];

/** Returns the doctor's saved custom dropdown options for the medicine editor. */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const doc = await MedicineOptions.findOne({ doctorId }).lean();
  return jsonOk({
    types:       doc?.types       ?? [],
    doses:       doc?.doses       ?? [],
    frequencies: doc?.frequencies ?? [],
    timings:     doc?.timings     ?? [],
  });
});

const addSchema = z.object({
  category: z.enum(CATEGORIES),
  value:    z.string().trim().min(1).max(80),
});

/** Adds a custom value to the specified category (upsert with $addToSet). */
export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { category, value } = await parseBody(req, addSchema);
  const doctorId = requireDoctorId(ctx);
  await MedicineOptions.updateOne(
    { doctorId },
    { $addToSet: { [category]: value } },
    { upsert: true },
  );
  return jsonOk({ ok: true }, 201);
});
