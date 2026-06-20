import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireActiveDoctor } from "@/lib/api/account";
import { requireDoctorId } from "@/lib/api/context";
import { CustomKeyword } from "@/models/CustomKeyword";
import { MedicineEntry } from "@/models/Medicine";
import { structureTranscript } from "@/lib/integrations/claude";

/**
 * Structure a dictated transcript into visit fields (spec §7.3). Passes the
 * doctor's personal keyword dictionary (§9.5) and known medicine list to Claude
 * so shorthand expands correctly, then auto-learns any new brand names into the
 * doctor's autocomplete list (§7.3). Returns the structured data for the doctor
 * to review — nothing is saved to the visit here; that happens on Confirm.
 */
const schema = z.object({ transcript: z.string().max(20_000) });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  await requireActiveDoctor(ctx);
  const { transcript } = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);

  const [keywords, medicines] = await Promise.all([
    CustomKeyword.find({ doctorId }).select("keyword expansion").lean(),
    MedicineEntry.find({ doctorId }).select("name").lean(),
  ]);

  const result = await structureTranscript(transcript, {
    keywords: keywords.map((k) => ({ keyword: k.keyword, expansion: k.expansion })),
    knownMedicines: medicines.map((m) => m.name),
  });

  if (!result.ok || !result.data) {
    throw Errors.badRequest(result.error ?? "Could not structure the dictation.");
  }

  // Auto-learn new medicine names for future autocomplete (§7.3). Best-effort.
  if (result.data.newMedicineNames.length > 0) {
    await Promise.all(
      result.data.newMedicineNames.map((name) =>
        MedicineEntry.updateOne(
          { doctorId, name },
          { $setOnInsert: { doctorId, name, voiceLearned: true } },
          { upsert: true, collation: { locale: "en", strength: 2 } },
        ).catch(() => undefined),
      ),
    );
  }

  return jsonOk({ structured: result.data });
});
