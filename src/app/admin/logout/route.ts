import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Clears the session cookie and returns to the login page. Used when a still-
 * valid cookie belongs to a deactivated admin (pages can't set cookies).
 * User-initiated logout uses the `logoutAction` server action instead.
 */
export function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
