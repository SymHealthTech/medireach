import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Applicant session for the "Get started" website forms: a signed JWT in an
 * httpOnly cookie that says "this browser may edit the forms of <email>".
 *
 * It is set when someone creates the first form for an email (nobody else had
 * one, so there's nothing to protect yet) or after they prove the email with a
 * one-time code. It is a separate cookie with its own audience, so it can never
 * be mistaken for an admin or doctor session.
 */

export const INTAKE_COOKIE = "mr_intake";
export const INTAKE_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const AUDIENCE = "medireach:intake";

const key = () => new TextEncoder().encode(env.sessionSecret());

export async function createIntakeToken(email: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${INTAKE_SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifyIntakeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: AUDIENCE });
    return typeof payload.sub === "string" && payload.sub.includes("@") ? payload.sub : null;
  } catch {
    return null;
  }
}

/** The email this browser has proven (or created a form with), or null. */
export async function getIntakeEmail(): Promise<string | null> {
  const token = (await cookies()).get(INTAKE_COOKIE)?.value;
  return token ? verifyIntakeToken(token) : null;
}

export async function setIntakeSession(email: string): Promise<void> {
  (await cookies()).set(INTAKE_COOKIE, await createIntakeToken(email), {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: INTAKE_SESSION_TTL_SECONDS,
  });
}

export async function clearIntakeSession(): Promise<void> {
  (await cookies()).delete(INTAKE_COOKIE);
}
