import "server-only";
import { randomInt } from "node:crypto";
import { OtpChallenge, type OtpChallengeDoc } from "@/models/OtpChallenge";
import { hashToken, verifyToken } from "@/lib/auth/password";

/**
 * OTP issuance + verification (spec §5.3, §15.1). Codes are 6 digits, valid for
 * 5 minutes, rate-limited by attempt count, and stored only as a hash. Delivery
 * is by EMAIL only (Change 3) — the caller sends the returned code via the email
 * integration; here we mint, persist, and verify, keyed by the email address.
 */
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  // randomInt is cryptographically secure; pad to 6 digits.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function issueOtp(
  purpose: OtpChallengeDoc["purpose"],
  email: string,
): Promise<string> {
  const dest = email.trim().toLowerCase();
  const code = generateOtpCode();
  const codeHash = await hashToken(code);
  // Invalidate any prior unconsumed challenge for this email+purpose.
  await OtpChallenge.deleteMany({ email: dest, purpose, consumed: false });
  await OtpChallenge.create({
    purpose,
    email: dest,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  return code; // caller sends via email; never returned to the client
}

export type OtpResult = "ok" | "invalid" | "expired" | "too-many-attempts";

export async function verifyOtp(
  purpose: OtpChallengeDoc["purpose"],
  email: string,
  code: string,
): Promise<OtpResult> {
  const dest = email.trim().toLowerCase();
  const challenge = await OtpChallenge.findOne({ email: dest, purpose, consumed: false }).sort({
    createdAt: -1,
  });
  if (!challenge) return "expired";
  if (challenge.expiresAt.getTime() < Date.now()) return "expired";
  if (challenge.attempts >= MAX_ATTEMPTS) return "too-many-attempts";

  const matches = await verifyToken(code, challenge.codeHash);
  if (!matches) {
    challenge.attempts += 1;
    await challenge.save();
    return "invalid";
  }

  challenge.consumed = true;
  await challenge.save();
  return "ok";
}
