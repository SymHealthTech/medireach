import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { scopedFind, scopedFindById } from "@/lib/api/scoped";
import { requireActiveDoctor } from "@/lib/api/account";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Patient } from "@/models/Patient";
import { Visit } from "@/models/Visit";
import { Certificate } from "@/models/Certificate";
import { certificateCreateSchema } from "@/lib/validation/certificate";
import { daysBetween } from "@/lib/certificate/render";
import { buildCertificateListFilter } from "@/lib/certificate/query";
import { RECORD, isCertificatePurpose } from "@/lib/constants";

/**
 * Medical Certificates (spec: Medical Certificates feature). Doctor-only — a
 * certificate is clinical/legal data the receptionist never touches (§5.2,
 * enforced here server-side). Every query is tenant-scoped, so a doctor only
 * ever sees/creates certificates for their own patients.
 */

/** POST /api/certificates — create (issue) a certificate for a patient. `days`
 *  is recomputed server-side from from/to so it can never be tampered. When a
 *  `visitId` is supplied (the certificate-only fast path), issuing the
 *  certificate also completes that queue visit. */
export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  await requireActiveDoctor(ctx);
  const data = await parseBody(req, certificateCreateSchema);

  // Confirm the patient belongs to this doctor before issuing anything against it.
  const patient = await scopedFindById(Patient, ctx, data.patientId).select("name").lean();
  if (!patient) throw Errors.notFound("Patient not found.");

  const toDate = (s?: string) => (s ? new Date(`${s}T00:00:00`) : undefined);
  const days = data.type === "unfit" ? daysBetween(data.fromDate, data.toDate) : undefined;

  const cert = await Certificate.create({
    doctorId: ctx.doctorId,
    patientId: data.patientId,
    patientName: patient.name ?? "",
    visitId: data.visitId,
    type: data.type,
    diagnosis: data.diagnosis,
    fromDate: toDate(data.fromDate),
    toDate: toDate(data.toDate),
    days,
    illness: data.illness,
    resumeDate: toDate(data.resumeDate),
    jobPurpose: data.jobPurpose,
    examinationSummary: data.examinationSummary,
    remarks: data.remarks,
    certificateDate: toDate(data.certificateDate) ?? new Date(),
  });

  // Certificate fast path: completing the certificate completes the visit,
  // so it drops out of the pending queue and shows as seen. A normal
  // consultation visit is left untouched (its own Confirm flow finalizes it).
  if (data.visitId) {
    const visit = await scopedFindById(Visit, ctx, data.visitId);
    if (visit && isCertificatePurpose(visit.visitMode) && visit.status !== "confirmed") {
      const now = new Date();
      visit.status = "confirmed";
      visit.confirmedAt = now;
      visit.editLockAt = new Date(now.getTime() + RECORD.EDIT_LOCK_DAYS * 86_400_000);
      await visit.save();
    }
  }

  await audit(ctx, "certificate.create", { targetType: "Certificate", targetId: cert._id, meta: { type: cert.type } });
  return jsonOk({ certificateId: String(cert._id) }, 201);
});

/**
 * GET /api/certificates — the Certificate Records list for legal retrieval.
 * Supports the queries an authority would use: patient name (`q`), certificate
 * `type`, and issue-date range (`from`/`to`). Optionally scoped to one patient
 * (`patientId`) for the per-patient history. Doctor-only, tenant-scoped.
 */
const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.string().trim().max(40).optional(),
  from: z.string().trim().max(10).optional(),
  to: z.string().trim().max(10).optional(),
  patientId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
});

export const GET = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  requireDoctorId(ctx);
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) throw Errors.badRequest("Invalid search parameters.");

  const filter = buildCertificateListFilter(parsed.data);
  if (parsed.data.patientId) filter.patientId = parsed.data.patientId;

  const certificates = await scopedFind(Certificate, ctx, filter)
    .select("type patientName patientId visitId diagnosis illness jobPurpose fromDate toDate days resumeDate certificateDate pdfAssetRef createdAt")
    .sort({ certificateDate: -1, createdAt: -1 })
    .limit(200)
    .lean();

  return jsonOk({
    certificates: certificates.map((c) => ({
      id: String(c._id),
      type: c.type,
      patientName: c.patientName ?? "",
      patientId: c.patientId ? String(c.patientId) : null,
      visitId: c.visitId ? String(c.visitId) : null,
      diagnosis: c.diagnosis ?? null,
      illness: c.illness ?? null,
      jobPurpose: c.jobPurpose ?? null,
      fromDate: c.fromDate ?? null,
      toDate: c.toDate ?? null,
      days: c.days ?? null,
      resumeDate: c.resumeDate ?? null,
      certificateDate: c.certificateDate,
      hasPdf: !!c.pdfAssetRef,
    })),
  });
});
