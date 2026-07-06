import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { PrescriptionTemplate } from "@/models/PrescriptionTemplate";
import { TEMPLATE_IDS, DEFAULT_TEMPLATE_ID } from "@/lib/prescription/templates";
import { signedAssetUrl } from "@/lib/integrations/cloudinary";

/**
 * Prescription template — Design Prescription (spec §8 redesign). The doctor
 * picks one of the 5 A4 templates and manages two customisations: an optional
 * signature image and the sponsor pharmacy footer. Returns the current template
 * (with a freshly signed signature URL) plus the doctor's clinic info used to
 * render the live preview / printed sheet / WhatsApp raster.
 */
async function getOrCreate(doctorId: string) {
  let tpl = await PrescriptionTemplate.findOne({ doctorId });
  if (!tpl) tpl = await PrescriptionTemplate.create({ doctorId, presetKey: DEFAULT_TEMPLATE_ID });
  return tpl;
}

export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const [tpl, doctor] = await Promise.all([getOrCreate(doctorId), loadDoctor(ctx)]);
  return jsonOk({
    template: {
      presetKey: tpl.presetKey,
      footer: tpl.footer ?? {},
      signaturePublicId: tpl.signaturePublicId ?? "",
      // Short-lived signed URL for the authenticated signature asset (§15.3).
      signatureUrl: tpl.signaturePublicId ? signedAssetUrl(tpl.signaturePublicId) : "",
    },
    clinic: {
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      clinicTimings: doctor.clinicTimings,
      clinicMobile: doctor.mobile,
      doctorName: doctor.name,
      degree: doctor.degree,
      registrationNumber: doctor.registrationNumber,
      defaultWhatsappTarget: doctor.defaultWhatsappTarget,
      clinicWhatsapp: doctor.clinicWhatsapp ?? "",
      receptionistWhatsapp: doctor.receptionistWhatsapp ?? "",
      storeWhatsapp: doctor.storeWhatsapp ?? "",
      prescriptionSendNumber: doctor.prescriptionSendNumber ?? "",
    },
  });
});

const updateSchema = z.object({
  presetKey: z.enum(TEMPLATE_IDS).optional(),
  // Empty string clears the signature (remove); a public_id sets/replaces it.
  signaturePublicId: z.string().trim().max(300).optional(),
  footer: z
    .object({
      storeName: z.string().trim().max(160).optional(),
      storeAddress: z.string().trim().max(300).optional(),
      storeContact: z.string().trim().max(60).optional(),
    })
    .optional(),
});

export const PATCH = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const data = await parseBody(req, updateSchema);
  const tpl = await getOrCreate(doctorId);

  if (data.presetKey !== undefined) tpl.presetKey = data.presetKey;
  if (data.signaturePublicId !== undefined) tpl.signaturePublicId = data.signaturePublicId || undefined;
  if (data.footer !== undefined) tpl.footer = data.footer;
  await tpl.save();

  // Keep the doctor's selected template reference in sync (§13).
  await loadDoctor(ctx).then((d) => {
    if (String(d.selectedTemplateId) !== String(tpl._id)) {
      d.selectedTemplateId = tpl._id;
      return d.save();
    }
  });

  await audit(ctx, "template.update", { targetType: "PrescriptionTemplate", targetId: tpl._id });
  return jsonOk({ ok: true });
});
