import { type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, jsonOk, Errors } from "@/lib/api/errors";
import { parseBody, fields } from "@/lib/api/validate";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { Doctor } from "@/models/Doctor";
import { issueOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/integrations/email";

/**
 * Onboarding step 1–2 (spec §5.3, Change 3): collect email + mobile and send a
 * verification OTP to the EMAIL only (no SMS). The mobile is stored as-is for
 * reference/support and is never OTP-verified. Rejects an email/mobile already
 * tied to a COMPLETED account; an abandoned (incomplete) signup may retry.
 */
const schema = z.object({ email: fields.email, mobile: fields.mobile });

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    rateLimit(`onboard-start:${clientIp(req)}`, 5, 60_000);

    const { email, mobile } = await parseBody(req, schema);

    const existing = await Doctor.findOne({ $or: [{ email }, { mobile }] });
    if (existing && existing.onboardingStep >= 7) {
      throw Errors.conflict("An account with this email or mobile already exists. Please log in.");
    }

    const code = await issueOtp("signup-verify", email);
    await sendOtpEmail(email, code);

    return jsonOk({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
