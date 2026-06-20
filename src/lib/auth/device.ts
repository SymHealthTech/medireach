import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { hashToken, verifyToken } from "@/lib/auth/password";
import type { TrustedDevice } from "@/models/Doctor";

/**
 * Trusted-device model (spec §15.1): OTP is required only on first login from a
 * new/unrecognized device; that device is then remembered so routine logins
 * skip OTP. We store a random opaque token in a long-lived cookie and keep only
 * its hash in the user's `trustedDevices`. Admin is explicitly excluded from
 * this — admin does mandatory MFA every login (§6.7).
 */

const DEVICE_COOKIE = "mr_device";
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function getDeviceTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

export async function setDeviceCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_TTL_SECONDS,
  });
}

/** Does the presented cookie token match any of the user's trusted devices? */
export async function isTrustedDevice(
  presentedToken: string | null,
  devices: TrustedDevice[],
): Promise<boolean> {
  if (!presentedToken) return false;
  for (const d of devices) {
    if (await verifyToken(presentedToken, d.tokenHash)) return true;
  }
  return false;
}

/** Build a TrustedDevice entry (hash only) for a freshly minted token. */
export async function buildTrustedDevice(
  token: string,
  label: string,
): Promise<TrustedDevice> {
  return { tokenHash: await hashToken(token), label, lastSeenAt: new Date() };
}
