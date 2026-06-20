import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { env } from "@/lib/env";
import { Admin } from "@/models/Admin";
import { hashPassword } from "@/lib/auth/password";
import { generateTotpSecret, totpAuthUri } from "@/lib/auth/totp";

/**
 * Bootstrap admin enrollment (spec §6.7). There is no public signup for admins;
 * this endpoint provisions one and is gated by the server-only admin route
 * secret (sent as a Bearer token), so only someone with deploy-level secrets can
 * create an admin. Returns the TOTP otpauth URI to scan into an authenticator —
 * the secret itself is then stored server-side only and required on every login.
 */
const schema = z.object({
  email: fields.email,
  name: z.string().trim().min(2),
  password: fields.password,
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${env.adminRouteSecret()}`) {
      throw Errors.unauthorized("Not authorized to enroll an admin.");
    }

    const { email, name, password } = await parseBody(req, schema);
    if (await Admin.findOne({ email })) {
      throw Errors.conflict("An admin with this email already exists.");
    }

    const secret = generateTotpSecret();
    await Admin.create({
      email,
      name,
      passwordHash: await hashPassword(password),
      mfaEnrolled: true,
      mfaSecret: secret,
    });

    return jsonOk({
      ok: true,
      otpauthUri: totpAuthUri(secret, email),
      message: "Scan the otpauth URI in an authenticator app, then log in with email + password + the 6-digit code.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
