import { type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk } from "@/lib/api/errors";
import { assertCron } from "@/lib/api/cron";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
import { Certificate } from "@/models/Certificate";
import { deleteAsset } from "@/lib/integrations/cloudinary";

/**
 * Daily retention purge (spec §9.3, §15.6). Hard-deletes patient/visit data
 * older than 1 year (the `purgeAfter` field), and removes the associated
 * Cloudinary scanned-report assets so deleted records don't linger in storage.
 * Runs as a scheduled job, not manual cleanup.
 */
export async function GET(req: NextRequest) {
  try {
    assertCron(req);
    await connectToDatabase();
    const now = new Date();

    // Remove report + prescription assets first (best-effort), then the visit rows.
    const expiredVisits = await Visit.find({ purgeAfter: { $lte: now } })
      .select("reportPublicIds prescriptionPdfPublicId")
      .lean();
    let assetsDeleted = 0;
    for (const v of expiredVisits) {
      const publicIds = [...(v.reportPublicIds ?? [])];
      if (v.prescriptionPdfPublicId) publicIds.push(v.prescriptionPdfPublicId);
      for (const publicId of publicIds) {
        try {
          await deleteAsset(publicId);
          assetsDeleted++;
        } catch {
          /* best-effort; continue */
        }
      }
    }

    // Certificates are legal instruments kept on a LONGER schedule than ordinary
    // visit data (RECORD.CERTIFICATE_RETENTION_DAYS, 3 years) — their own
    // purgeAfter is set 3 years out at issue, so this same {purgeAfter <= now}
    // sweep excludes them from the 1-year purge and only removes them once that
    // longer window elapses. Drop the PDF asset before the row so nothing lingers.
    const expiredCerts = await Certificate.find({ purgeAfter: { $lte: now } })
      .select("pdfAssetRef")
      .lean();
    for (const c of expiredCerts) {
      if (!c.pdfAssetRef) continue;
      try {
        await deleteAsset(c.pdfAssetRef);
        assetsDeleted++;
      } catch {
        /* best-effort; continue */
      }
    }

    const visitResult = await Visit.deleteMany({ purgeAfter: { $lte: now } });
    const certResult = await Certificate.deleteMany({ purgeAfter: { $lte: now } });
    const patientResult = await Patient.deleteMany({ purgeAfter: { $lte: now } });

    return jsonOk({
      ok: true,
      visitsDeleted: visitResult.deletedCount ?? 0,
      certificatesDeleted: certResult.deletedCount ?? 0,
      patientsDeleted: patientResult.deletedCount ?? 0,
      assetsDeleted,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
