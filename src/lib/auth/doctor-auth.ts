import "server-only";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { MongoClient } from "mongodb";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import { audit } from "@/lib/api/audit";
import {
  LOGIN_LINK_TTL_SECONDS,
  authSecret,
  doctorGreetingName,
  hitLoginLinkLimit,
  loginDoctorFor,
  normalizeEmail,
  sendLoginLink,
} from "@/lib/auth/login-link";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { SITE_URL } from "@/lib/site";

/**
 * NextAuth (v4) for doctors only: Email provider (magic link via Resend), the
 * MongoDB adapter for verification tokens, and a 30-day JWT session in
 * NextAuth's own cookie. Admins keep their separate password login
 * (lib/auth/session.ts), so the two never share a cookie.
 *
 * Only emails that match a doctor's `ownerEmail` can log in. Requests for any
 * other email look identical to the caller (no account enumeration).
 */

export const DOCTOR_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

// NextAuth builds callback links from NEXTAUTH_URL; default it to the site URL.
process.env.NEXTAUTH_URL ??= SITE_URL;

let options: NextAuthOptions | null = null;

export function authOptions(): NextAuthOptions {
  if (options) return options;
  options = {
    secret: authSecret(),
    adapter: MongoDBAdapter(async () => (await connectToDatabase()).connection.getClient() as unknown as MongoClient, {
      databaseName: env.mongoDbName(),
    }) as Adapter,
    session: { strategy: "jwt", maxAge: DOCTOR_SESSION_MAX_AGE },
    pages: { signIn: "/login", verifyRequest: "/login", error: "/login" },
    providers: [
      EmailProvider({
        // Mail goes through Resend in sendVerificationRequest; this transport is never used.
        server: { host: "localhost", port: 25, auth: { user: "", pass: "" } },
        from: "MediReach",
        maxAge: LOGIN_LINK_TTL_SECONDS,
        normalizeIdentifier: normalizeEmail,
        // Only reached when someone posts to /api/auth/signin/email directly;
        // /login uses its own server action. Same rules, silently applied.
        async sendVerificationRequest({ identifier }) {
          const limit = await hitLoginLinkLimit(identifier);
          if (!limit.allowed) return;
          await sendLoginLink(identifier);
        },
      }),
    ],
    callbacks: {
      async signIn({ user, email }) {
        if (email?.verificationRequest) return true; // eligibility is checked when sending
        return Boolean(user.email && (await loginDoctorFor(user.email)));
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        try {
          if (new URL(url).origin === baseUrl) return url;
        } catch {
          // fall through
        }
        return `${baseUrl}/account`;
      },
    },
    events: {
      async signIn({ user }) {
        const doctor = user.email ? await loginDoctorFor(user.email) : null;
        if (!doctor) return;
        await audit({ userId: String(doctor._id), role: "doctor", name: doctorGreetingName(doctor) }, "doctor.login", {
          entity: "DoctorProfile",
          entityId: doctor._id,
        });
      },
    },
  };
  return options;
}
