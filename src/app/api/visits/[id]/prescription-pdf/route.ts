import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Visit } from "@/models/Visit";
import { deleteAsset, signedPrescriptionPdfUrl } from "@/lib/integrations/cloudinary";

/**
 * Record the Cloudinary public_id of a prescription PDF the doctor just uploaded
 * for a visit, and return a signed, expiring delivery URL to drop into the
 * patient's WhatsApp message (§7.5, §15.3). The public_id must live in the
 * doctor's own `prescription` folder — a client can't point this at an arbitrary
 * asset. Storing it on the visit lets the retention purge clean it up later.
 */
const schema = z.object({
  publicId: z.string().trim().min(1).max(300),
});

export const POST = route<{ id: string }>({ roles: Roles.doctorOnly }, async (req, ctx, { id }) => {
  const { publicId } = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);

  // The signed upload always lands in medireach/prescription/<doctorId>/… — reject
  // anything outside the caller's own prescription folder.
  const expectedPrefix = `medireach/prescription/${doctorId}/`;
  if (!publicId.startsWith(expectedPrefix)) {
    throw Errors.badRequest("Invalid prescription file reference.");
  }

  const visit = await scopedFindById(Visit, ctx, id);
  if (!visit) throw Errors.notFound("Visit not found.");

  // Re-send: drop the previous PDF asset so we don't leave orphans in storage.
  const previous = visit.prescriptionPdfPublicId;
  if (previous && previous !== publicId) {
    try {
      await deleteAsset(previous);
    } catch {
      /* best-effort */
    }
  }

  visit.prescriptionPdfPublicId = publicId;
  await visit.save();

  await audit(ctx, "prescription.share", { targetType: "Visit", targetId: visit._id });
  return jsonOk({ url: signedPrescriptionPdfUrl(publicId) });
});
