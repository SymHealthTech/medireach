import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { CustomKeyword } from "@/models/CustomKeyword";
import { KEYWORD_FIELD_KEYS } from "@/lib/constants";

/**
 * Custom keyword shortcuts (spec §9.5) — the doctor's personal shorthand
 * dictionary (e.g. "p5" → "Tab. Paracetamol 500mg"), managed under
 * Menu → Edit Keyword and used as context by the AI structuring layer. Strictly
 * personal — scoped by doctorId. Each keyword belongs to a `field` category so
 * the shortcut expands into the right consultation field.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const keywords = await CustomKeyword.find({ doctorId: requireDoctorId(ctx) })
    .select("field keyword expansion medicine")
    .sort({ keyword: 1 })
    .lean();
  return jsonOk({
    keywords: keywords.map((k) => ({
      id: String(k._id),
      field: k.field ?? "medicine",
      keyword: k.keyword,
      expansion: k.expansion,
      medicine: k.medicine,
    })),
  });
});

const medicineSchema = z
  .object({
    type: z.string().trim().max(24).optional(),
    name: z.string().trim().max(120).optional(),
    generic: z.string().trim().max(160).optional(),
    dose: z.string().trim().max(40).optional(),
    frequency: z.string().trim().max(40).optional(),
    timing: z.string().trim().max(60).optional(),
    source: z.enum(["clinic", "pharmacy"]).optional(),
  })
  .optional();

const addSchema = z.object({
  field: z.enum(KEYWORD_FIELD_KEYS).default("medicine"),
  keyword: z.string().trim().min(1).max(40),
  expansion: z.string().trim().min(1).max(300),
  medicine: medicineSchema,
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { field, keyword, expansion, medicine } = await parseBody(req, addSchema);
  const doctorId = requireDoctorId(ctx);
  // Key the upsert on (doctorId, keyword) to match the unique index: re-adding an
  // existing shortcut updates it (and re-assigns its field) instead of colliding.
  const update =
    field === "medicine"
      ? { $set: { field, expansion, medicine }, $setOnInsert: { doctorId, keyword } }
      : { $set: { field, expansion }, $unset: { medicine: "" }, $setOnInsert: { doctorId, keyword } };
  await CustomKeyword.updateOne({ doctorId, keyword }, update, {
    upsert: true,
    collation: { locale: "en", strength: 2 },
  });
  return jsonOk({ ok: true }, 201);
});
