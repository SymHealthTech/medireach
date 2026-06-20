import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Role } from "@/lib/constants";

/**
 * Session tokens (spec §15.1): signed JWTs stored in secure, httpOnly cookies —
 * never localStorage (XSS-exposed). jose is used because it runs in both the
 * Node and Edge (middleware) runtimes.
 *
 * The session payload deliberately carries `doctorId` for clinic-scoped roles
 * so authorization checks never have to trust a client-supplied tenant id.
 */

export const SESSION_COOKIE = "mr_session";

/** Seconds from now until midnight IST (UTC+5:30), minimum 60. */
function secondsUntilMidnightIST(): number {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowInISTMs = Date.now() + IST_OFFSET_MS;
  const msIntoDayIST = nowInISTMs % (24 * 60 * 60 * 1000);
  const msUntilMidnight = 24 * 60 * 60 * 1000 - msIntoDayIST;
  return Math.max(60, Math.floor(msUntilMidnight / 1000));
}

export interface SessionClaims {
  sub: string; // user _id
  role: Role;
  // For doctor: own id. For receptionist: their linked doctor's id. Absent for admin.
  doctorId?: string;
  name: string;
  // Token version for the receptionist role — checked per request so the doctor
  // changing the password (or deleting the account) invalidates the session
  // immediately. Absent for doctor/admin.
  tv?: number;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret());
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + secondsUntilMidnightIST();
  return new SignJWT({
    role: claims.role,
    doctorId: claims.doctorId,
    name: claims.name,
    ...(typeof claims.tv === "number" ? { tv: claims.tv } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      doctorId: typeof payload.doctorId === "string" ? payload.doctorId : undefined,
      name: typeof payload.name === "string" ? payload.name : "",
      tv: typeof payload.tv === "number" ? payload.tv : undefined,
    };
  } catch {
    return null;
  }
}

/** Write the session cookie (httpOnly, secure in prod, SameSite=Lax). */
export async function setSessionCookie(claims: SessionClaims): Promise<void> {
  const token = await createSessionToken(claims);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: secondsUntilMidnightIST(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Read + verify the current session from the request cookies, or null. */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
