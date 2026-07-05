import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Doctor } from "@/models/Doctor";
import { DEFAULT_TIER } from "@/lib/constants";

/**
 * Returns the current authenticated identity (any role). Demonstrates the guard
 * and gives the client a way to bootstrap the signed-in user without exposing
 * anything beyond the trusted session claims.
 *
 * For clinic roles it also returns the account's subscription `tier`, read live
 * from the doctor record so the UI can conditionally render Pro-only affordances
 * (voice/dictate). This is a UI convenience only — the hard tier enforcement is
 * server-side in requireProTier, so hiding the mic is never the security
 * boundary. Reading it live means an immediate upgrade reflects on next fetch.
 */
export const GET = route(
  { roles: [...Roles.clinic, ...Roles.adminOnly] },
  async (_req, ctx) => {
    let tier: string | null = null;
    if (ctx.doctorId) {
      const doctor = await Doctor.findById(ctx.doctorId).select("tier").lean();
      tier = doctor?.tier ?? DEFAULT_TIER;
    }
    return jsonOk({
      userId: ctx.userId,
      role: ctx.role,
      doctorId: ctx.doctorId,
      name: ctx.name,
      tier,
    });
  },
);
