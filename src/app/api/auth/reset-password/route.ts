import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { resolveClinicUser } from "@/lib/auth/users";
import { verifyOtp } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { Doctor } from "@/models/Doctor";
import { Receptionist } from "@/models/Receptionist";

/**
 * Account recovery — step 2 (spec §5.3, §15.1): verify the reset OTP and set a
 * new password. Trusted devices are cleared so the next login re-verifies via
 * OTP — a password reset is exactly the moment that extra check earns its keep.
 */
const schema = z.object({
  identifier: z.string().trim().min(3),
  code: fields.otp,
  password: fields.password,
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`reset:${clientIp(req)}`, 10, 60_000);

    const { identifier, code, password } = await parseBody(req, schema);
    const user = await resolveClinicUser(identifier);
    if (!user?.email) throw Errors.badRequest("Unable to reset password for this account.");

    const result = await verifyOtp("password-reset", user.email, code);
    if (result === "too-many-attempts") throw Errors.tooManyRequests();
    if (result !== "ok") throw Errors.unauthorized("That code is invalid or has expired.");

    const passwordHash = await hashPassword(password);
    const update = { $set: { passwordHash, trustedDevices: [] } };
    if (user.role === "doctor") {
      await Doctor.updateOne({ _id: user.id }, update);
    } else {
      await Receptionist.updateOne({ _id: user.id }, update);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
