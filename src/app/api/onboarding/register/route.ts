import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { Doctor } from "@/models/Doctor";
import { verifyOtp } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";

/**
 * Onboarding step 2–3 (spec §5.3, Change 3): verify the EMAIL OTP and create the
 * account with the chosen password. The mobile is stored as-is and is NOT
 * OTP-verified. The account is created in `incomplete-onboarding` status
 * (onboardingStep 3) — not usable until all 7 steps finish. A session is issued
 * so the doctor can proceed through the remaining steps.
 */
const schema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: fields.email,
  mobile: fields.mobile,
  code: fields.otp,
  password: fields.password,
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`onboard-register:${clientIp(req)}`, 10, 60_000);

    const { name, email, mobile, code, password } = await parseBody(req, schema);

    const existing = await Doctor.findOne({ $or: [{ email }, { mobile }] });
    if (existing && existing.onboardingStep >= 7) {
      throw Errors.conflict("An account with this email or mobile already exists.");
    }

    const result = await verifyOtp("signup-verify", email, code);
    if (result === "too-many-attempts") throw Errors.tooManyRequests();
    if (result !== "ok") throw Errors.unauthorized("That code is invalid or has expired.");

    const passwordHash = await hashPassword(password);

    // Reuse an abandoned incomplete record if present, else create fresh.
    const doctor =
      existing ??
      new Doctor({ email, mobile });
    doctor.name = name;
    doctor.email = email;
    doctor.mobile = mobile;
    // Email is the verified channel now; the mobile is stored unverified (Change 3).
    doctor.mobileVerified = false;
    doctor.passwordHash = passwordHash;
    doctor.accountStatus = "incomplete-onboarding";
    doctor.onboardingStep = Math.max(doctor.onboardingStep, 3);
    await doctor.save();

    await setSessionCookie({
      sub: doctor._id.toString(),
      role: "doctor",
      doctorId: doctor._id.toString(),
      name: doctor.name,
    });

    return jsonOk({ ok: true, onboardingStep: doctor.onboardingStep });
  } catch (err) {
    return errorResponse(err);
  }
}
