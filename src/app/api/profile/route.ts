import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { GST_STATE_CODE_SET } from "@/lib/constants";

/**
 * Doctor profile (spec §12). GET returns the editable profile + the in-app ID
 * (shown in the menu header) and current preferences. PATCH updates editable
 * fields. The receptionist can read the clinic name/doctor name for headers but
 * not edit — so GET is allowed for both roles, PATCH is doctor-only.
 */
export const GET = route({ roles: Roles.clinic }, async (_req, ctx) => {
  const doctor = await loadDoctor(ctx);
  return jsonOk({
    appId: doctor.appId ?? null,
    name: doctor.name,
    email: doctor.email,
    mobile: doctor.mobile,
    photoPublicId: doctor.photoPublicId ?? null,
    registrationNumber: doctor.registrationNumber,
    degree: doctor.degree,
    clinicName: doctor.clinicName,
    clinicAddress: doctor.clinicAddress,
    clinicStateCode: doctor.clinicStateCode ?? "",
    clinicTimings: doctor.clinicTimings,
    themePreference: doctor.themePreference,
    defaultWhatsappTarget: doctor.defaultWhatsappTarget,
    clinicWhatsapp: doctor.clinicWhatsapp ?? "",
    receptionistWhatsapp: doctor.receptionistWhatsapp ?? "",
    storeWhatsapp: doctor.storeWhatsapp ?? "",
    prescriptionSendNumber: doctor.prescriptionSendNumber ?? "",
    accountStatus: doctor.accountStatus,
  });
});

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  registrationNumber: z.string().trim().max(60).optional(),
  degree: z.string().trim().max(120).optional(),
  clinicName: z.string().trim().max(160).optional(),
  clinicAddress: z.string().trim().max(400).optional(),
  clinicStateCode: z
    .string()
    .trim()
    .refine((v) => v === "" || GST_STATE_CODE_SET.has(v), "Invalid state.")
    .optional(),
  clinicTimings: z.string().trim().max(160).optional(),
  photoPublicId: z.string().trim().optional(),
  themePreference: z.enum(["light", "dark"]).optional(),
  defaultWhatsappTarget: z.enum(["patient", "clinic", "receptionist", "store"]).optional(),
  clinicWhatsapp: z.string().trim().max(20).optional(),
  receptionistWhatsapp: z.string().trim().max(20).optional(),
  storeWhatsapp: z.string().trim().max(20).optional(),
  prescriptionSendNumber: z.string().trim().max(20).optional(),
});

export const PATCH = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const data = await parseBody(req, updateSchema);
  const doctor = await loadDoctor(ctx);
  // Use $set directly so new schema fields are always persisted regardless of
  // Mongoose's compiled-model cache state in the dev hot-reload environment.
  await doctor.updateOne({ $set: data });
  await audit(ctx, "profile.update", { targetType: "Doctor", targetId: doctor._id });
  return jsonOk({ ok: true });
});
