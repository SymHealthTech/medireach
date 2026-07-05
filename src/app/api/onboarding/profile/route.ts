import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { GST_STATE_CODE_SET } from "@/lib/constants";

/**
 * Onboarding step 4 (spec §5.3): clinic + doctor profile. Photo is optional
 * (uploaded separately via the signed-upload route). Advances onboardingStep
 * to 4 without yet activating the account.
 */
const schema = z.object({
  name: z.string().trim().min(2),
  registrationNumber: z.string().trim().min(1, "Medical registration number is required."),
  degree: z.string().trim().min(1, "Degree / qualification is required."),
  clinicName: z.string().trim().min(1, "Clinic name is required."),
  clinicAddress: z.string().trim().min(1, "Clinic address is required."),
  clinicStateCode: z
    .string()
    .trim()
    .refine((v) => v === "" || GST_STATE_CODE_SET.has(v), "Invalid state.")
    .optional()
    .default(""),
  clinicTimings: z.string().trim().optional().default(""),
  photoPublicId: z.string().trim().optional(),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const data = await parseBody(req, schema);
  const doctor = await loadDoctor(ctx);

  doctor.name = data.name;
  doctor.registrationNumber = data.registrationNumber;
  doctor.degree = data.degree;
  doctor.clinicName = data.clinicName;
  doctor.clinicAddress = data.clinicAddress;
  doctor.clinicStateCode = data.clinicStateCode;
  doctor.clinicTimings = data.clinicTimings;
  if (data.photoPublicId) doctor.photoPublicId = data.photoPublicId;
  doctor.onboardingStep = Math.max(doctor.onboardingStep, 4);
  await doctor.save();

  await audit(ctx, "onboarding.profile", { targetType: "Doctor", targetId: doctor._id });
  return jsonOk({ ok: true, onboardingStep: doctor.onboardingStep });
});
