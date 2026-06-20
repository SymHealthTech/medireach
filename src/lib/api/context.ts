import "server-only";
import type { Role } from "@/lib/constants";
import { Errors } from "@/lib/api/errors";

/**
 * AuthContext — the trusted, server-derived identity of the caller. Every value
 * here comes from the verified session JWT, NEVER from request body/query/
 * headers. Authorization decisions and tenant scoping read only from this.
 */
export interface AuthContext {
  userId: string;
  role: Role;
  /**
   * The clinic tenant this request is scoped to.
   *  - doctor:       their own id
   *  - receptionist: their linked doctor's id
   *  - admin:        null (the SOLE role permitted to cross doctorId, §6.7)
   */
  doctorId: string | null;
  name: string;
}

/**
 * The tenant filter that MUST be spread into every clinic-scoped query
 * (spec §13, §15.2). For doctor/receptionist this pins the query to one
 * doctorId; calling it for admin throws, forcing admin cross-tenant queries to
 * be written explicitly and visibly rather than silently spanning clinics.
 */
export function tenantFilter(ctx: AuthContext): { doctorId: string } {
  if (!ctx.doctorId) {
    throw Errors.forbidden("This action is scoped to a single clinic.");
  }
  return { doctorId: ctx.doctorId };
}

/** Assert and narrow that the context carries a concrete tenant scope. */
export function requireDoctorId(ctx: AuthContext): string {
  if (!ctx.doctorId) throw Errors.forbidden("No clinic scope on this request.");
  return ctx.doctorId;
}
