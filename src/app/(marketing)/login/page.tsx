import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck, Clock, MessageSquareText, QrCode } from "lucide-react";
import { DoctorLoginForm } from "@/components/account/DoctorLoginForm";
import { LogoBadge } from "@/components/brand/Logo";
import { getCurrentAccount } from "@/lib/auth/doctor";

export const metadata: Metadata = { title: { absolute: "Log in – MediReach" }, robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  Verification: "That login link has expired or was already used. Request a new one below.",
  AccessDenied: "We couldn't log you in with that link. Request a new one, or message us on WhatsApp.",
};

/** What a logged-in doctor or site owner can do (see /account). */
const AFTER_LOGIN = [
  { icon: Clock, text: "Full update access: change anything on your website" },
  { icon: QrCode, text: "Download and share your visiting card" },
  { icon: MessageSquareText, text: "Request changes from our team" },
  { icon: CalendarCheck, text: "See your renewal date" },
];

/**
 * Email-link login for doctors and clinic/hospital owners: a two-panel card
 * (deep-teal welcome panel with what you can do after logging in, and the
 * form) on the hero wash. Mobile shows the form only, under the badge.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentAccount()) redirect("/account");
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Something went wrong. Please request a new login link.") : undefined;
  return (
    <main className="mr-hero-bg relative -mt-16 overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:pb-28 lg:pt-36">
      <div className="mx-auto grid max-w-[960px] overflow-hidden rounded-3xl bg-surface shadow-lift ring-1 ring-ink/5 lg:grid-cols-[1fr_1.1fr]">
        <aside className="mr-ink-bg relative hidden flex-col justify-between overflow-hidden p-10 text-paper lg:flex">
          <span aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full border border-paper/10" />
          <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full border border-paper/10" />
          <div className="relative">
            <LogoBadge className="size-12" />
            <p className="mt-8 font-display text-[32px] font-semibold leading-[1.15] tracking-[-0.015em]">
              Your practice, <span className="text-marigold">always up to date.</span>
            </p>
            <p className="mt-3 text-paper/75">One login for your website and visiting card.</p>
          </div>
          <ul className="relative mt-10 space-y-4">
            {AFTER_LOGIN.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-paper/10 ring-1 ring-paper/15">
                  <Icon aria-hidden className="size-5 text-marigold" strokeWidth={1.75} />
                </span>
                <span className="text-paper/90">{text}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10">
          <LogoBadge className="mb-6 size-11 lg:hidden" />
          <DoctorLoginForm linkError={message} />
        </div>
      </div>
    </main>
  );
}
