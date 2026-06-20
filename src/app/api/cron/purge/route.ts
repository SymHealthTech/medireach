import { type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk } from "@/lib/api/errors";
import { assertCron } from "@/lib/api/cron";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
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

    // Remove report assets first (best-effort), then the visit rows.
    const expiredVisits = await Visit.find({ purgeAfter: { $lte: now } })
      .select("reportPublicIds")
      .lean();
    let assetsDeleted = 0;
    for (const v of expiredVisits) {
      for (const publicId of v.reportPublicIds ?? []) {
        try {
          await deleteAsset(publicId);
          assetsDeleted++;
        } catch {
          /* best-effort; continue */
        }
      }
    }

    const visitResult = await Visit.deleteMany({ purgeAfter: { $lte: now } });
    const patientResult = await Patient.deleteMany({ purgeAfter: { $lte: now } });

    return jsonOk({
      ok: true,
      visitsDeleted: visitResult.deletedCount ?? 0,
      patientsDeleted: patientResult.deletedCount ?? 0,
      assetsDeleted,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
