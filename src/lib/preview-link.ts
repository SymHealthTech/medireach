import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/lib/env";
import { absUrl } from "@/lib/site";

/**
 * Private preview links for a doctor, clinic or hospital to check their
 * website and visiting card before it goes live. The link is signed (no
 * login needed), expires, and the page is never indexed.
 */

export type PreviewTarget = { kind: "doctor" | "site"; id: string };

const PREVIEW_DAYS = 30;
const AUDIENCE = "medireach-preview";

// A separate key from login sessions, derived from the same secret.
const key = () => new TextEncoder().encode(`preview:${env.sessionSecret()}`);

export async function createPreviewToken(t: PreviewTarget): Promise<string> {
  return new SignJWT({ k: t.kind === "doctor" ? "d" : "s" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(t.id)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${PREVIEW_DAYS}d`)
    .sign(key());
}

export async function readPreviewToken(token: string): Promise<PreviewTarget | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: AUDIENCE });
    const id = payload.sub ?? "";
    if (!/^[a-f0-9]{24}$/i.test(id) || (payload.k !== "d" && payload.k !== "s")) return null;
    return { kind: payload.k === "d" ? "doctor" : "site", id };
  } catch {
    return null;
  }
}

export const previewUrl = (token: string) => absUrl(`/preview/${token}`);
export const PREVIEW_LINK_DAYS = PREVIEW_DAYS;
