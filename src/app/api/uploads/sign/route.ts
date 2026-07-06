import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { createSignedUpload } from "@/lib/integrations/cloudinary";

/**
 * Mint signed Cloudinary upload params (spec §15.3). Shared by onboarding
 * (verification document, profile photo) and the consultation screen (scanned
 * reports, §7.3). The folder is always namespaced to the requesting doctor's
 * id from the trusted session — a client can't choose an arbitrary folder.
 * Doctor-only: receptionists never upload (clinical, §5.2).
 */
const schema = z.object({
  purpose: z.enum(["verification", "profile-photo", "report", "card-cover", "signature"]),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { purpose } = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);
  const folder = `medireach/${purpose}/${doctorId}`;
  return jsonOk(createSignedUpload(folder));
});
