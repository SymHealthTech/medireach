import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Doctor } from "@/models/Doctor";
import { Invoice } from "@/models/Invoice";
import { Sponsor } from "@/models/Sponsor";
import { Visit } from "@/models/Visit";
import { signedAssetUrl } from "@/lib/integrations/cloudinary";
import { audit } from "@/lib/api/audit";

/**
 * Full admin view of one doctor's account (spec §6.1): profile, billing
 * history, patient-volume trend, sponsor, and the submitted verification
 * document via a short-lived SIGNED URL (never a public link, §15.3).
 */
export const GET = route<{ id: string }>({ roles: Roles.adminOnly }, async (_req, ctx, { id }) => {
  const doctor = await Doctor.findById(id).lean();
  if (!doctor) throw Errors.notFound("Doctor not found.");

  const [invoices, sponsor, totalPatients] = await Promise.all([
    Invoice.find({ doctorId: id }).sort({ cycleNumber: -1 }).limit(24).lean(),
    Sponsor.findOne({ doctorId: id }).lean(),
    Visit.countDocuments({ doctorId: id, status: "confirmed" }),
  ]);

  let documentUrl: string | null = null;
  if (doctor.verificationDocument?.publicId) {
    try {
      documentUrl = signedAssetUrl(doctor.verificationDocument.publicId, 300);
    } catch {
      documentUrl = null;
    }
  }

  await audit(ctx, "admin.doctor.view", { targetType: "Doctor", targetId: id });

  return jsonOk({
    doctor: {
      id: String(doctor._id),
      name: doctor.name,
      appId: doctor.appId ?? null,
      email: doctor.email,
      mobile: doctor.mobile,
      registrationNumber: doctor.registrationNumber,
      degree: doctor.degree,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      accountStatus: doctor.accountStatus,
      cycleStartDate: doctor.cycleStartDate ?? null,
      verificationDocument: doctor.verificationDocument
        ? { type: doctor.verificationDocument.type, reviewStatus: doctor.verificationDocument.reviewStatus, url: documentUrl }
        : null,
    },
    totalPatients,
    sponsor: sponsor
      ? { storeName: sponsor.storeName, contactNumber: sponsor.contactNumber, paymentResponsibility: sponsor.paymentResponsibility }
      : null,
    invoices: invoices.map((i) => ({
      id: String(i._id),
      cycleNumber: i.cycleNumber,
      amount: i.amount,
      patientCount: i.patientCount,
      status: i.status,
      payer: i.payer,
      dueDate: i.dueDate,
    })),
  });
});
