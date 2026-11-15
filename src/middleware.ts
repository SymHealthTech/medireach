import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/constants";

/**
 * Edge middleware: first-line gate keeping unauthenticated users out of the
 * admin dashboard. Defense-in-depth ONLY — authoritative role checks happen
 * server-side in every route handler / server action.
 *
 * Subdomain rewriting (Phase 2) and the doctor /account area (Phase 7) are
 * added here later.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || !(ADMIN_ROLES as readonly string[]).includes(session.role)) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
