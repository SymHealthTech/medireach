import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { scopedFindById } from "@/lib/api/scoped";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
import { requireDoctorId } from "@/lib/api/context";
import { startOfDaysAgoIST } from "@/lib/time";
import { RECORD } from "@/lib/constants";
import { signedAssetUrl } from "@/lib/integrations/cloudinary";

/**
 * Returns signed Cloudinary URLs for all scanned reports attached to this
 * patient's past confirmed visits (within the retention window). Doctor-only.
 * URLs expire in 5 minutes — never stored long-lived (spec §15.3).
 */
export const GET = route<{ id: string }>({ roles: Roles.doctorOnly }, async (_req, ctx, { id }) => {
  const patient = await scopedFindById(Patient, ctx, id).lean();
  if (!patient) throw Errors.notFound("Patient not found.");

  const since = startOfDaysAgoIST(RECORD.RETENTION_DAYS);
  const visits = await Visit.find({
    doctorId: requireDoctorId(ctx),
    patientId: id,
    status: "confirmed",
    confirmedAt: { $gte: since },
    "reportPublicIds.0": { $exists: true },
  })
    .select("reportPublicIds confirmedAt createdAt")
    .sort({ confirmedAt: -1 })
    .lean();

  const reports = visits.flatMap((v) =>
    (v.reportPublicIds ?? []).map((publicId) => ({
      publicId,
      signedUrl: signedAssetUrl(publicId),
      date: (v.confirmedAt ?? v.createdAt).toISOString(),
      visitId: String(v._id),
    })),
  );

  return jsonOk({ reports });
});
