"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { requestLoginLinkAction, type LoginLinkState } from "@/app/(marketing)/login/actions";

const input =
  "h-12 w-full rounded-[10px] border border-line bg-surface px-3 text-base text-body outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/20 aria-invalid:border-clay";
const primary =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98] disabled:opacity-60";

/** Email-only login for doctors and clinic/hospital owners: one field, then a "Check your email" screen with resend. */
export function DoctorLoginForm({ linkError }: { linkError?: string }) {
  const [state, action, pending] = useActionState<LoginLinkState, FormData>(requestLoginLinkAction, {});
  const [editing, setEditing] = useState(false);
  const [resends, setResends] = useState(0);

  if (state.sent && !editing) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8" role="status">
        <MailCheck className="size-10 text-leaf" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">Check your email</h1>
        <p className="mt-3 text-body">
          If <strong className="break-all text-ink">{state.sent}</strong> is registered with MediReach, a login link is on its way. It works
          once and expires in 24 hours.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Can&apos;t see it? Check your spam or promotions folder.</p>
        <form action={action} onSubmit={() => setResends((n) => n + 1)} className="mt-6 space-y-3">
          <input type="hidden" name="email" value={state.sent} />
          <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-ink px-6 font-semibold text-ink hover:bg-sage disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" />} Resend link
          </button>
          {resends > 0 && !pending && <p className="text-center text-sm text-leaf-text">Sent again.</p>}
        </form>
        <button type="button" onClick={() => setEditing(true)} className="mt-4 min-h-11 w-full text-sm font-medium text-ink underline">
          Use a different email
        </button>
      </div>
    );
  }

  const error = state.error ?? (state.sent ? undefined : linkError);
  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
      <h1 className="font-display text-3xl font-semibold text-ink">Log in to MediReach</h1>
      <p className="mt-1 text-sm font-medium text-muted-foreground">For doctors, clinics and hospitals</p>
      <p className="mt-3 text-body">Enter the email you gave MediReach. We&apos;ll email you a link to log in. No password needed.</p>
      <form
        action={(fd) => {
          setEditing(false);
          setResends(0);
          action(fd);
        }}
        className="mt-6 space-y-4"
        noValidate
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-body">Email</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email ?? state.sent}
            className={input}
            aria-invalid={state.error ? true : undefined}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-clay-text">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={primary}>
          {pending && <Loader2 className="size-4 animate-spin" />} Send login link
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Not set up for login yet?{" "}
        <Link href="/contact" className="font-medium text-ink underline">
          Contact us
        </Link>{" "}
        and we&apos;ll turn it on for your site.
      </p>
    </div>
  );
}
