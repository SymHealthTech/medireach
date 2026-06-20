import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { Admin } from "@/models/Admin";
import { verifyPassword } from "@/lib/auth/password";
import { verifyTotp } from "@/lib/auth/totp";
import { setSessionCookie } from "@/lib/auth/session";

/**
 * Admin login (spec §6.7): mandatory MFA on EVERY login — no trusted-device
 * exception. Requires email + password + a current TOTP code in a single step.
 * Lives on its own auth path, never sharing a session/flow with clinic logins.
 */
const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  totp: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    // Tighter limit than clinic login given this is the highest-value target.
    rateLimit(`admin-login:${clientIp(req)}`, 5, 60_000);

    const { email, password, totp } = await parseBody(req, schema);
    const admin = await Admin.findOne({ email });

    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw Errors.unauthorized("Invalid credentials.");
    }
    if (!admin.mfaEnrolled || !admin.mfaSecret) {
      throw Errors.forbidden("MFA enrollment required before login.");
    }
    if (!verifyTotp(admin.mfaSecret, totp)) {
      throw Errors.unauthorized("Invalid authentication code.");
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    await setSessionCookie({ sub: admin._id.toString(), role: "admin", name: admin.name });
    return jsonOk({ ok: true, role: "admin" });
  } catch (err) {
    return errorResponse(err);
  }
}
