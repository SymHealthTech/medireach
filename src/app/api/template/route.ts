import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { PrescriptionTemplate } from "@/models/PrescriptionTemplate";
import { TEMPLATE_PRESETS, DEFAULT_PRESET_KEY } from "@/lib/prescription/presets";

/**
 * Prescription template — Design Prescription (spec §8, §12). The doctor picks
 * one of the presets and lightly customizes clinic-name override, logo
 * placement, and the sponsor footer (Open Decision §16.3 default). Returns the
 * current template plus the doctor's clinic info used to render previews.
 */
const presetKeys = TEMPLATE_PRESETS.map((p) => p.key) as [string, ...string[]];

async function getOrCreate(doctorId: string) {
  let tpl = await PrescriptionTemplate.findOne({ doctorId });
  if (!tpl) tpl = await PrescriptionTemplate.create({ doctorId, presetKey: DEFAULT_PRESET_KEY });
  return tpl;
}

export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const [tpl, doctor] = await Promise.all([getOrCreate(doctorId), loadDoctor(ctx)]);
  return jsonOk({
    template: {
      presetKey: tpl.presetKey,
      clinicNameOverride: tpl.clinicNameOverride ?? "",
      logoPlacement: tpl.logoPlacement,
      footer: tpl.footer ?? {},
    },
    clinic: {
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      clinicTimings: doctor.clinicTimings,
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
  presetKey: z.enum(presetKeys).optional(),
  clinicNameOverride: z.string().trim().max(160).optional(),
  logoPlacement: z.enum(["left", "center", "right"]).optional(),
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
  if (data.clinicNameOverride !== undefined) tpl.clinicNameOverride = data.clinicNameOverride;
  if (data.logoPlacement !== undefined) tpl.logoPlacement = data.logoPlacement;
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
