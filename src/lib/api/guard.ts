import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { isReceptionistSessionValid, isDoctorSessionValid } from "@/lib/auth/users";
import { Errors, errorResponse } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/api/context";

/**
 * route() — the single authentication + authorization gate every API route
 * goes through (spec §15.2, build-prompt "shared middleware, written once,
 * applied everywhere"). It:
 *
 *   1. ensures the DB is connected,
 *   2. verifies a valid session exists (else 401),
 *   3. verifies the caller's role is in the allowed set (else 403),
 *   4. hands the handler a trusted AuthContext derived only from the session,
 *   5. converts any thrown ApiError into a clean JSON response.
 *
 * Routes NEVER read identity/tenant from the request body — only from `ctx`.
 * This is what makes "anyone can call the API directly via dev tools" safe.
 */

type Handler<P> = (
  req: NextRequest,
  ctx: AuthContext,
  params: P,
) => Promise<NextResponse> | NextResponse;

interface RouteOptions {
  roles: Role[];
}

// Next.js 15 passes the second arg as `{ params: Promise<...> }` for every
// route handler (params is empty for non-dynamic routes). It must be a required
// param to satisfy Next's generated route type checker.
type SegmentData<P> = { params: Promise<P> };

export function route<P = Record<string, string>>(
  opts: RouteOptions,
  handler: Handler<P>,
) {
  return async (req: NextRequest, segment: SegmentData<P>): Promise<NextResponse> => {
    try {
      await connectToDatabase();

      const session = await getSession();
      if (!session) throw Errors.unauthorized();

      if (!opts.roles.includes(session.role)) {
        throw Errors.forbidden();
      }

      // Receptionist sessions are invalidated immediately when the doctor
      // changes the password or deletes the account (Change 1).
      if (session.role === "receptionist" && !(await isReceptionistSessionValid(session.sub, session.tv))) {
        throw Errors.unauthorized("Your session is no longer valid. Please log in again.");
      }

      // Doctor sessions are invalidated when a newer device logs in (single-device
      // enforcement). sv is absent for incomplete-onboarding sessions, which pass.
      if (session.role === "doctor" && !(await isDoctorSessionValid(session.sub, session.sv))) {
        throw Errors.unauthorized("You have been signed in on another device. Please log in again.");
      }

      const ctx: AuthContext = {
        userId: session.sub,
        role: session.role,
        doctorId: session.doctorId ?? null,
        name: session.name,
      };

      const params = await segment.params;
      return await handler(req, ctx, params);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Convenience presets for the common role sets. */
export const Roles = {
  doctorOnly: ["doctor"] as Role[],
  receptionistOnly: ["receptionist"] as Role[],
  clinic: ["doctor", "receptionist"] as Role[], // either front-desk role
  adminOnly: ["admin"] as Role[],
};
