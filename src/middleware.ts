import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Edge middleware: first-line gate keeping unauthenticated users out of the app
 * shells (spec §3.2, §6.7). Defense-in-depth ONLY — authoritative role/tenant
 * checks happen server-side in every API route via route() (§15.2).
 *
 * Two distinct, non-overlapping protected areas with separate login paths:
 *   /app/*      → doctor/receptionist session
 *   /console/*  → admin session only (separate, harder-to-guess path than the
 *                 obvious "/admin"; the admin panel never shares an auth path
 *                 with the clinic app, §6.7).
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (path.startsWith("/console")) {
    if (path === "/console/login") return NextResponse.next(); // login page is public
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/console/login", req.url));
    }
    return NextResponse.next();
  }

  // /app/*
  if (!session || (session.role !== "doctor" && session.role !== "receptionist")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/console/:path*"],
};
