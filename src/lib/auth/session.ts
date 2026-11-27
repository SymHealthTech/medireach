import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { ROLES, type Role } from "@/lib/constants";

/**
 * Session tokens: signed JWTs stored in secure, httpOnly cookies — never
 * localStorage (XSS-exposed). jose is used because it runs in both the Node and
 * Edge (middleware) runtimes.
 */

export const SESSION_COOKIE = "mr_session";

/** Admin sessions last a working day; doctor sessions are long-lived (Phase 7). */
export const SESSION_TTL_SECONDS: Record<Role, number> = {
  superadmin: 12 * 60 * 60,
  sales: 12 * 60 * 60,
  doctor: 30 * 24 * 60 * 60,
  owner: 30 * 24 * 60 * 60,
};

export interface SessionClaims {
  sub: string; // user _id (Admin) or DoctorProfile _id (doctor)
  role: Role;
  name: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret());
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS[claims.role]}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || !(ROLES as readonly string[]).includes(payload.role as string)) {
      return null;
    }
    return {
      sub: payload.sub,
      role: payload.role as Role,
      name: typeof payload.name === "string" ? payload.name : "",
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
    maxAge: SESSION_TTL_SECONDS[claims.role],
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
