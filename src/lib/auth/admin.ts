import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ADMIN_ROLES, type AdminRole } from "@/lib/constants";
import { Admin } from "@/models/Admin";

/**
 * Server-side identity + role checks for the dashboard. Every page and every
 * server action calls one of these; the middleware gate is only a first line.
 * The role comes from the database, not the session token.
 */

export interface CurrentAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

/** Permission sets, in one place. */
export const can = {
  publish: (r: AdminRole) => r === "superadmin" || r === "admin",
  seePaymentTotals: (r: AdminRole) => r === "superadmin" || r === "admin",
  manageMasters: (r: AdminRole) => r === "superadmin" || r === "admin",
  manageSettings: (r: AdminRole) => r === "superadmin" || r === "admin",
  manageAdmins: (r: AdminRole) => r === "superadmin",
};

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** The signed-in, active admin for this request, or null. Cached per request. */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const session = await getSession();
  if (!session || !(ADMIN_ROLES as readonly string[]).includes(session.role)) return null;
  if (!/^[a-f0-9]{24}$/i.test(session.sub)) return null;
  await connectToDatabase();
  const admin = await Admin.findOne({ _id: session.sub, active: true })
    .select({ name: 1, email: 1, role: 1 })
    .lean();
  if (!admin) return null;
  return { id: String(admin._id), name: admin.name, email: admin.email, role: admin.role };
});

/**
 * For pages/layouts: the current admin, or redirect to login. When a
 * still-valid cookie belongs to a deactivated admin, go via /admin/logout so
 * the cookie is cleared.
 */
export async function requireAdminPage(roles: readonly AdminRole[] = ADMIN_ROLES): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const session = await getSession();
    redirect(session ? "/admin/logout" : "/admin/login");
  }
  if (!roles.includes(admin.role)) redirect("/admin?denied=1");
  return admin;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireAdmin(roles: readonly AdminRole[] = ADMIN_ROLES): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new ForbiddenError("Your session has ended. Please log in again.");
  if (!roles.includes(admin.role)) throw new ForbiddenError();
  return admin;
}
