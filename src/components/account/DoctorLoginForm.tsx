"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
import {
  requestLoginCodeAction,
  verifyLoginCodeAction,
  type LoginCodeState,
  type VerifyCodeState,
} from "@/app/(marketing)/login/actions";
import { startNavigationProgress } from "@/components/loading/NavigationProgress";

const input =
  "h-12 w-full rounded-[10px] border border-line bg-paper pl-11 pr-3 text-base text-body outline-none transition-colors focus-visible:border-lagoon focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-lagoon/20 aria-invalid:border-clay";
const primary =
  "group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-marigold px-6 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(218,138,67,.8)] transition-colors hover:bg-marigold-700 active:scale-[.98] disabled:opacity-60";
const link = "min-h-11 text-sm font-semibold text-lagoon underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline";

const RESEND_AFTER_S = 30;

/**
 * Email OTP login for doctors and clinic/hospital owners, all on /login:
 * enter your email, get a 6-digit code, type it here, and land on /account.
 * The page supplies the card around it.
 */
export function DoctorLoginForm({ linkError }: { linkError?: string }) {
  const [state, action, pending] = useActionState<LoginCodeState, FormData>(requestLoginCodeAction, {});
  const [editing, setEditing] = useState(false);

  if (state.sent && !editing) {
    return <CodeStep email={state.sent} resend={action} resending={pending} onChangeEmail={() => setEditing(true)} />;
  }

  const error = state.error ?? (state.sent ? undefined : linkError);
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-lagoon">For doctors, clinics and hospitals</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-ink">Welcome back</h1>
      <p className="mt-3 text-body/85">Enter the email you gave MediReach and we&apos;ll send you a 6-digit login code.</p>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1 text-sm font-semibold text-ink-700">
        <KeyRound aria-hidden className="size-4" strokeWidth={2} /> No password needed
      </p>
      <form
        action={(fd) => {
          setEditing(false);
          action(fd);
        }}
        className="mt-7 space-y-4"
        noValidate
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-ink">Email</span>
          <span className="relative block">
            <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              defaultValue={state.values?.email ?? state.sent}
              className={input}
              aria-invalid={state.error ? true : undefined}
              placeholder="you@example.com"
            />
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-clay-text">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={primary}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Send login code
          {!pending && <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />}
        </button>
      </form>
      <p className="mt-8 border-t border-line pt-5 text-sm text-muted-foreground">
        Not set up for login yet?{" "}
        <Link href="/contact" className="font-semibold text-lagoon underline-offset-4 hover:underline">
          Contact us
        </Link>{" "}
        and we&apos;ll turn it on for your site.
      </p>
    </div>
  );
}

/** Step 2: the 6-digit code. Submits by itself once six digits are in (typed, pasted or autofilled). */
function CodeStep({
  email,
  resend,
  resending,
  onChangeEmail,
}: {
  email: string;
  resend: (fd: FormData) => void;
  resending: boolean;
  onChangeEmail: () => void;
}) {
  const [state, verify, checking] = useActionState<VerifyCodeState, FormData>(verifyLoginCodeAction, {});
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(RESEND_AFTER_S);
  const [resent, setResent] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const busy = checking || Boolean(state.redirectTo);

  // Correct code: the callback sets the session cookie and lands on /account.
  useEffect(() => {
    if (state.redirectTo) {
      startNavigationProgress();
      window.location.assign(state.redirectTo);
    }
  }, [state.redirectTo]);

  // After a wrong code, clear the box and put the cursor back.
  useEffect(() => {
    if (state.error) {
      setCode("");
      field.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  function onCode(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !busy) queueMicrotask(() => form.current?.requestSubmit());
  }

  function sendAgain() {
    const fd = new FormData();
    fd.set("email", email);
    startTransition(() => resend(fd));
    setResent(true);
    setWait(RESEND_AFTER_S);
    setCode("");
    field.current?.focus();
  }

  return (
    <div>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-leaf/15">
        <MailCheck aria-hidden className="size-7 text-leaf-text" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-semibold leading-tight text-ink">Enter your code</h1>
      <p className="mt-3 text-body/85" role="status">
        If <strong className="break-all text-ink">{email}</strong> is registered with MediReach, we&apos;ve emailed it a 6-digit code. It
        expires in 10 minutes.
      </p>

      <form ref={form} action={verify} className="mt-7 space-y-4" noValidate>
        <input type="hidden" name="email" value={email} />
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-ink">Login code</span>
          <input
            ref={field}
            name="code"
            value={code}
            onChange={(e) => onCode(e.target.value)}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="••••••"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "code-error" : undefined}
            disabled={busy}
            className="h-16 w-full rounded-xl border border-line bg-paper text-center font-display text-[32px] font-semibold tracking-[0.5em] text-ink outline-none transition-colors placeholder:text-line focus-visible:border-lagoon focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-lagoon/20 disabled:opacity-60 aria-invalid:border-clay"
          />
        </label>
        {state.error && (
          <p id="code-error" role="alert" className="text-sm text-clay-text">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={busy || code.length !== 6} className={primary}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} {state.redirectTo ? "Logging you in…" : "Log in"}
          {!busy && <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">Can&apos;t see it? Check your spam or promotions folder.</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-4">
        <button type="button" onClick={sendAgain} disabled={wait > 0 || resending || busy} className={link}>
          {resending ? "Sending…" : wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        </button>
        <button type="button" onClick={onChangeEmail} disabled={busy} className={link}>
          Use a different email
        </button>
      </div>
      {resent && !resending && wait > RESEND_AFTER_S - 5 && <p className="mt-1 text-sm text-leaf-text">New code sent. Use the latest one.</p>}
    </div>
  );
}
