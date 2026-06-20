import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk } from "@/lib/api/errors";
import { parseBody } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { resolveClinicUser } from "@/lib/auth/users";
import { issueOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/integrations/email";

/**
 * Account recovery — step 1 (spec §5.3, §15.1, Change 3): send a reset OTP to
 * the registered EMAIL only (no SMS). Always returns ok regardless of whether
 * the account exists, to avoid leaking which accounts are registered.
 */
const schema = z.object({ identifier: z.string().trim().min(3) });

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`forgot:${clientIp(req)}`, 5, 60_000);

    const { identifier } = await parseBody(req, schema);
    const user = await resolveClinicUser(identifier);

    if (user?.email) {
      const code = await issueOtp("password-reset", user.email);
      await sendOtpEmail(user.email, code);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
