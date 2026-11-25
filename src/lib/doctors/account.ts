import { z } from "zod";

/**
 * "Prefer us to do it?" on /account: a doctor asks the team to make a change
 * for them (they can also change everything themselves, see
 * app/account/actions.ts saveMyDoctorSectionAction).
 */
export const changeRequestSchema = z.object({
  description: z.string().trim().min(10, "Tell us what to change (at least a few words).").max(2000, "Use at most 2000 characters."),
});
