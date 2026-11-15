import "server-only";
import type { Role } from "@/lib/constants";

/**
 * AuthContext — the trusted, server-derived identity of the caller. Every value
 * here comes from the verified session JWT, NEVER from request body/query/
 * headers. Authorization decisions read only from this.
 *
 * For the `doctor` role, `userId` is the caller's own DoctorProfile id, so
 * self-edit routes scope to it rather than to any id the client sends.
 */
export interface AuthContext {
  userId: string;
  role: Role;
  name: string;
}
