import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { MedicineEntry } from "@/models/Medicine";

/**
 * Per-doctor medicine autocomplete (spec §7.3). Strictly personal — scoped by
 * doctorId, never shared. GET supports a prefix query for the typeahead and
 * returns { name, generic } objects. POST lets the doctor persist a brand name
 * with its generic composition.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const filter: Record<string, unknown> = { doctorId: requireDoctorId(ctx) };
  if (q) filter.name = { $regex: `^${escapeRegex(q)}`, $options: "i" };

  const meds = await MedicineEntry.find(filter)
    .select("name generic")
    .sort({ name: 1 })
    .limit(20)
    .lean();
  return jsonOk({ medicines: meds.map((m) => ({ name: m.name, generic: m.generic ?? "" })) });
});

const addSchema = z.object({
  name: z.string().trim().min(1).max(120),
  generic: z.string().trim().max(200).optional(),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { name, generic } = await parseBody(req, addSchema);
  const doctorId = requireDoctorId(ctx);
  await MedicineEntry.updateOne(
    { doctorId, name },
    { $setOnInsert: { doctorId, name, generic: generic ?? "", voiceLearned: false } },
    { upsert: true, collation: { locale: "en", strength: 2 } },
  );
  return jsonOk({ ok: true }, 201);
});
