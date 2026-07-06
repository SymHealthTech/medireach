import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rate-limit";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/integrations/email";
import { Doctor } from "@/models/Doctor";

/**
 * Change the doctor's mobile number (profile §12). The email is the immutable,
 * verified identity, so it can never change — but the mobile can, guarded by an
 * OTP sent to that email:
 *
 *   POST  → validate the new number, ensure it isn't taken, and email an OTP.
 *   PATCH → verify the OTP and commit the new number.
 *
 * Doctor-only: the receptionist cannot alter the doctor's contact identity.
 */

/** Mask an email for display, e.g. "satish30yash@gmail.com" → "sa••••@gmail.com". */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

/**
 * Ensure the requested mobile is a valid change: different from the current one
 * and not already registered to another doctor. Throws a user-facing error
 * otherwise. Returns the normalized 10-digit number.
 */
async function assertMobileAvailable(current: string, next: string, selfId: unknown): Promise<void> {
  if (next === current) throw Errors.badRequest("That is already your registered mobile number.");
  const taken = await Doctor.exists({ mobile: next, _id: { $ne: selfId } });
  if (taken) throw Errors.conflict("That mobile number is already in use by another account.");
}

const requestSchema = z.object({ mobile: fields.mobile });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { mobile } = await parseBody(req, requestSchema);
  const doctor = await loadDoctor(ctx);
  // Rate-limit OTP issuance per doctor to prevent email flooding.
  rateLimit(`mobile-change:${doctor._id.toString()}`, 5, 60_000);

  await assertMobileAvailable(doctor.mobile, mobile, doctor._id);

  const code = await issueOtp("mobile-change", doctor.email);
  await sendOtpEmail(doctor.email, code);
  await audit(ctx, "profile.mobile.otp-sent", { targetType: "Doctor", targetId: doctor._id });

  return jsonOk({ ok: true, email: maskEmail(doctor.email) });
});

const confirmSchema = z.object({ mobile: fields.mobile, code: fields.otp });

export const PATCH = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { mobile, code } = await parseBody(req, confirmSchema);
  const doctor = await loadDoctor(ctx);
  rateLimit(`mobile-change-confirm:${doctor._id.toString()}`, 10, 60_000);

  // Re-check availability at commit time — the target number could have been
  // claimed in the window between requesting and confirming the OTP.
  await assertMobileAvailable(doctor.mobile, mobile, doctor._id);

  const result = await verifyOtp("mobile-change", doctor.email, code);
  if (result === "too-many-attempts") throw Errors.tooManyRequests();
  if (result !== "ok") throw Errors.badRequest("That code is invalid or has expired.");

  doctor.mobile = mobile;
  try {
    await doctor.save();
  } catch (err) {
    // Unique-index collision (11000) → surface as a clean conflict, not a 500.
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      throw Errors.conflict("That mobile number is already in use by another account.");
    }
    throw err;
  }
  await audit(ctx, "profile.mobile.update", { targetType: "Doctor", targetId: doctor._id });

  return jsonOk({ ok: true, mobile });
});
