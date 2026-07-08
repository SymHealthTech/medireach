import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFindById } from "@/lib/api/scoped";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Certificate } from "@/models/Certificate";
import { deleteAsset, signedPrescriptionPdfUrl } from "@/lib/integrations/cloudinary";

/**
 * Record the Cloudinary public_id of a certificate PDF the doctor just uploaded,
 * and return a signed, 90-day delivery URL to drop into the patient's WhatsApp
 * message — the exact same mechanism as the prescription PDF (§7.5, §15.3). The
 * public_id must live in the doctor's own `certificate` folder, so a client
 * can't point this at an arbitrary asset. Storing it on the certificate lets the
 * retention purge clean it up later.
 */
const schema = z.object({
  publicId: z.string().trim().min(1).max(300),
});

export const POST = route<{ id: string }>({ roles: Roles.doctorOnly }, async (req, ctx, { id }) => {
  const { publicId } = await parseBody(req, schema);
  const doctorId = requireDoctorId(ctx);

  const expectedPrefix = `medireach/certificate/${doctorId}/`;
  if (!publicId.startsWith(expectedPrefix)) {
    throw Errors.badRequest("Invalid certificate file reference.");
  }

  const cert = await scopedFindById(Certificate, ctx, id);
  if (!cert) throw Errors.notFound("Certificate not found.");

  // Re-share: drop the previous PDF asset so we don't leave orphans in storage.
  const previous = cert.pdfAssetRef;
  if (previous && previous !== publicId) {
    try {
      await deleteAsset(previous);
    } catch {
      /* best-effort */
    }
  }

  cert.pdfAssetRef = publicId;
  await cert.save();

  await audit(ctx, "certificate.share", { targetType: "Certificate", targetId: cert._id });
  return jsonOk({ url: signedPrescriptionPdfUrl(publicId) });
});

/**
 * GET /api/certificates/[id]/pdf — a fresh signed, expiring delivery URL for a
 * previously-issued certificate's stored PDF, so the doctor can re-view or
 * re-download it from the Certificate Records list (legal retrieval).
 */
export const GET = route<{ id: string }>({ roles: Roles.doctorOnly }, async (_req, ctx, { id }) => {
  const cert = await scopedFindById(Certificate, ctx, id).select("pdfAssetRef").lean();
  if (!cert) throw Errors.notFound("Certificate not found.");
  if (!cert.pdfAssetRef) throw Errors.notFound("No PDF stored for this certificate.");
  return jsonOk({ url: signedPrescriptionPdfUrl(cert.pdfAssetRef) });
});
