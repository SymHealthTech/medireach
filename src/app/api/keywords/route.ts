import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { CustomKeyword } from "@/models/CustomKeyword";

/**
 * Custom keyword shortcuts (spec §9.5) — the doctor's personal shorthand
 * dictionary (e.g. "p5" → "Tab. Paracetamol 500mg"), managed under
 * Menu → Edit Keyword and used as context by the AI structuring layer. Strictly
 * personal — scoped by doctorId.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const keywords = await CustomKeyword.find({ doctorId: requireDoctorId(ctx) })
    .select("keyword expansion")
    .sort({ keyword: 1 })
    .lean();
  return jsonOk({ keywords: keywords.map((k) => ({ id: String(k._id), keyword: k.keyword, expansion: k.expansion })) });
});

const addSchema = z.object({
  keyword: z.string().trim().min(1).max(40),
  expansion: z.string().trim().min(1).max(300),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { keyword, expansion } = await parseBody(req, addSchema);
  const doctorId = requireDoctorId(ctx);
  await CustomKeyword.updateOne(
    { doctorId, keyword },
    { $set: { expansion }, $setOnInsert: { doctorId, keyword } },
    { upsert: true, collation: { locale: "en", strength: 2 } },
  );
  return jsonOk({ ok: true }, 201);
});
