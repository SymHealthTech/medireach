import "server-only";
import type { HydratedDocument } from "mongoose";
import type { DoctorDoc } from "@/models/Doctor";
import { Errors } from "@/lib/api/errors";

/**
 * Pro-tier cost guard (two-tier system, Change 2 — the hard security/cost
 * boundary). This is the SINGLE place the "voice + AI" gate is enforced, applied
 * at the very top of every server route that can reach a paid API
 * (speech-to-text or the Claude/Anthropic API). It is deliberately shaped like
 * an auth check: centralized, applied consistently, and evaluated BEFORE any
 * paid call is made.
 *
 * A Starter account must NEVER trigger a paid API call — not via the UI, not via
 * a malformed or direct API request that bypasses the UI. Passing the caller the
 * already-loaded doctor document (from requireActiveDoctor) keeps this a pure,
 * synchronous check with no extra DB round-trip and no way to spoof the tier
 * from the request body (the tier is read from the trusted DB record only).
 *
 * There is intentionally no "force"/override path here: the only routes calling
 * paid providers are /api/transcribe, /api/structure and /api/patients/structure
 * (verified by grep), and all three go through this guard. No background job,
 * cron, webhook, retry, or fallback reaches those providers.
 */
export function requireProTier(doctor: HydratedDocument<DoctorDoc>): void {
  if (doctor.tier !== "pro") {
    throw Errors.forbidden("Voice and AI features require the Pro plan.");
  }
}
