import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { loadDoctor } from "@/lib/api/account";

/**
 * Lets the onboarding wizard resume at the right step after an interruption
 * (spec §5.3 incomplete-onboarding handling). Returns only non-sensitive
 * progress fields.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctor = await loadDoctor(ctx);
  return jsonOk({
    onboardingStep: doctor.onboardingStep,
    accountStatus: doctor.accountStatus,
    appId: doctor.appId ?? null,
    name: doctor.name,
    email: doctor.email,
    mobile: doctor.mobile,
    hasDocument: !!doctor.verificationDocument,
  });
});
