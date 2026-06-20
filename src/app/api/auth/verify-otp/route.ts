import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { verifyOtp } from "@/lib/auth/otp";
import { setSessionCookie } from "@/lib/auth/session";
import {
  generateDeviceToken,
  setDeviceCookie,
  buildTrustedDevice,
} from "@/lib/auth/device";
import { resolveClinicUser, appendTrustedDevice } from "@/lib/auth/users";

/**
 * Completes a new-device login (spec §15.1): verifies the OTP, then mints and
 * remembers a trusted-device token so future logins from this device skip OTP.
 */
const schema = z.object({
  identifier: z.string().trim().min(3),
  code: fields.otp,
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`verify-otp:${clientIp(req)}`, 10, 60_000);

    const { identifier, code } = await parseBody(req, schema);
    const user = await resolveClinicUser(identifier);
    if (!user || !user.email) throw Errors.badRequest("Unable to verify this code.");

    const result = await verifyOtp("new-device", user.email, code);
    if (result === "too-many-attempts") throw Errors.tooManyRequests();
    if (result !== "ok") throw Errors.unauthorized("That code is invalid or has expired.");

    // Remember this device.
    const token = generateDeviceToken();
    await appendTrustedDevice(user.id, user.role, await buildTrustedDevice(token, "device"));
    await setDeviceCookie(token);

    await setSessionCookie({
      sub: user.id,
      role: user.role,
      doctorId: user.doctorId,
      name: user.name,
      tv: user.tokenVersion,
    });

    return jsonOk({ ok: true, role: user.role });
  } catch (err) {
    return errorResponse(err);
  }
}
