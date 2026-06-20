import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { VERIFICATION_DOC_TYPES } from "@/lib/constants";

/**
 * Onboarding step 5 (spec §5.3): record the ONE uploaded verification document
 * (registration / degree / clinic certificate — doctor's choice). The file was
 * uploaded directly to Cloudinary as an authenticated asset; we store only its
 * public_id (§15.3). This is NOT a pre-activation gate — admin reviews it later
 * (§6.1). Advances onboardingStep to 5.
 */
const schema = z.object({
  publicId: z.string().trim().min(1),
  type: z.enum(VERIFICATION_DOC_TYPES),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { publicId, type } = await parseBody(req, schema);
  const doctor = await loadDoctor(ctx);

  doctor.verificationDocument = {
    publicId,
    type,
    reviewStatus: "submitted",
    submittedAt: new Date(),
  };
  doctor.onboardingStep = Math.max(doctor.onboardingStep, 5);
  await doctor.save();

  await audit(ctx, "onboarding.document.submit", {
    targetType: "Doctor",
    targetId: doctor._id,
    meta: { type },
  });
  return jsonOk({ ok: true, onboardingStep: doctor.onboardingStep });
});
