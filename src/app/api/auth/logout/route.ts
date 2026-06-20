import { errorResponse, jsonOk } from "@/lib/api/errors";
import { clearSessionCookie } from "@/lib/auth/session";

/** Logout — clears the session cookie (spec §12). The trusted-device cookie is
 * intentionally left in place so the next login on this device skips OTP. */
export async function POST() {
  try {
    await clearSessionCookie();
    return jsonOk({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
