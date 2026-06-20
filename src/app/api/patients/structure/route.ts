import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireActiveDoctor } from "@/lib/api/account";
import { structurePatient } from "@/lib/integrations/claude";

/**
 * Structure a spoken patient intake into registration fields (Change 2).
 * Doctor-only — voice input is exclusive to the doctor role (§5.2), so the
 * receptionist can never reach this. Returns the extracted fields for the
 * doctor to review and edit before confirming; nothing is saved here.
 */
const schema = z.object({ transcript: z.string().max(5000) });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  await requireActiveDoctor(ctx);
  const { transcript } = await parseBody(req, schema);

  const result = await structurePatient(transcript);
  if (!result.ok || !result.data) {
    throw Errors.badRequest(result.error ?? "Could not read the details.");
  }
  return jsonOk({ structured: result.data });
});
