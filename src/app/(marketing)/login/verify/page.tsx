import type { Metadata } from "next";
import Link from "next/link";
import { callbackUrlFor, loginTokenValid, normalizeEmail } from "@/lib/auth/login-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Log in – MediReach" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Landing page for emailed login links. Logging in takes one tap here (a
 * plain link to NextAuth's callback), so mail scanners that open links
 * automatically can't use up the one-time token.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token = "", email = "" } = await searchParams;
  const wellFormed = /^[a-f0-9]{64}$/.test(token) && /^[^\s@]{1,64}@[^\s@]{1,190}$/.test(email);
  const valid = wellFormed && (await loginTokenValid(token, email));
  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        {valid ? (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink">Log in to MediReach</h1>
            <p className="mt-3 text-body">
              You&apos;re logging in as <strong className="break-all text-ink">{normalizeEmail(email)}</strong>.
            </p>
            <a
              href={callbackUrlFor(token, normalizeEmail(email))}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98]"
            >
              Log in
            </a>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink">This link has expired</h1>
            <p className="mt-3 text-body">Login links work once and expire after 24 hours. Request a new one and we&apos;ll email it to you.</p>
            <Link
              href="/login"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700"
            >
              Get a new link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
