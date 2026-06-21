import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { resolveClinicUser, bumpDoctorSessionVersion } from "@/lib/auth/users";

/**
 * Doctor / Receptionist login. Validates credentials and issues a session
 * expiring at midnight IST. Email or mobile accepted for doctors; receptionists
 * use their username. Admin uses a separate MFA-mandatory path.
 *
 * Generic failure messages avoid revealing whether an account exists.
 */
const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`login:${clientIp(req)}`, 10, 60_000);

    const { identifier, password } = await parseBody(req, loginSchema);
    const user = await resolveClinicUser(identifier);

    // Constant-ish path: always reaching here, generic error on any mismatch.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw Errors.unauthorized("Incorrect login details. Please try again.");
    }

    // A doctor must finish onboarding before the app is usable (§5.3). We still
    // issue a session so they can RESUME the wizard (skipping new-device OTP,
    // since the account isn't active yet); the app shell redirects them to
    // /signup until all 7 steps complete.
    if (user.role === "doctor" && !user.onboardingComplete) {
      await setSessionCookie({
        sub: user.id,
        role: user.role,
        doctorId: user.doctorId,
        name: user.name,
      });
      return jsonOk({ ok: false, onboardingIncomplete: true });
    }

    // For doctors: bump sessionVersion so any prior device session is immediately
    // invalidated on their next API call (single-device enforcement, §15.1).
    const sv =
      user.role === "doctor" ? await bumpDoctorSessionVersion(user.id) : undefined;

    await setSessionCookie({
      sub: user.id,
      role: user.role,
      doctorId: user.doctorId,
      name: user.name,
      tv: user.tokenVersion,
      sv,
    });

    return jsonOk({ ok: true, role: user.role });
  } catch (err) {
    return errorResponse(err);
  }
}
