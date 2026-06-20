import "server-only";
import type { HydratedDocument } from "mongoose";
import { Doctor, type DoctorDoc } from "@/models/Doctor";
import { Errors } from "@/lib/api/errors";
import { requireDoctorId, type AuthContext } from "@/lib/api/context";

export type DoctorDocument = HydratedDocument<DoctorDoc>;

/**
 * Loads the doctor tenant for a request (works for doctor and receptionist
 * roles, both of which resolve to a single doctorId). Throws 404 if missing.
 * Returns the hydrated document so callers can mutate + save.
 */
export async function loadDoctor(ctx: AuthContext): Promise<DoctorDocument> {
  const doctor = await Doctor.findById(requireDoctorId(ctx));
  if (!doctor) throw Errors.notFound("Clinic account not found.");
  return doctor;
}

/**
 * Gate for clinical/billing actions (spec §5.3, §11): the account must be fully
 * onboarded and active. Onboarding routes deliberately do NOT use this, so a
 * doctor can complete the 7 steps. When access is paused (day 40 unpaid, §11),
 * doctors are blocked here with a 402 while their data is preserved.
 */
export async function requireActiveDoctor(ctx: AuthContext): Promise<DoctorDocument> {
  const doctor = await loadDoctor(ctx);

  if (doctor.onboardingStep < 7 || doctor.accountStatus === "incomplete-onboarding") {
    throw Errors.forbidden("Finish onboarding before using the app.");
  }
  if (doctor.accountStatus === "paused") {
    throw Errors.paymentRequired(
      "Your subscription payment is pending. Your data is safe — access resumes as soon as payment clears.",
    );
  }
  if (doctor.accountStatus === "suspended" || doctor.accountStatus === "unsubscribed") {
    throw Errors.forbidden("This account is not active. Please contact support.");
  }
  return doctor;
}
