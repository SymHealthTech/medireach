import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";

/**
 * Returns the current authenticated identity (any role). Demonstrates the guard
 * and gives the client a way to bootstrap the signed-in user without exposing
 * anything beyond the trusted session claims.
 */
export const GET = route(
  { roles: [...Roles.clinic, ...Roles.adminOnly] },
  async (_req, ctx) =>
    jsonOk({ userId: ctx.userId, role: ctx.role, doctorId: ctx.doctorId, name: ctx.name }),
);
