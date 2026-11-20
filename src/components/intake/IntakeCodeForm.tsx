"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { requestIntakeCodeAction, verifyIntakeCodeAction, type VerifyIntakeResult } from "@/app/(marketing)/get-started/actions";
import type { IntakeKind } from "@/lib/constants";
import { cn } from "@/lib/cn";

type Verified = Extract<VerifyIntakeResult, { ok: true }>;

const LENGTH = 6;

/** "Enter the 6-digit code we emailed to …", with resend. The code was already sent when this shows. */
export function IntakeCodeForm({ email, kind, onVerified, onBack, className }: { email: string; kind?: IntakeKind; onVerified: (r: Verified) => void; onBack?: () => void; className?: string }) {
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<"verify" | "resend" | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== LENGTH) return;
    setPending("verify");
    setError(null);
    const r = await verifyIntakeCodeAction({ email, code, kind });
    setPending(null);
    if (r.ok) onVerified(r);
    else setError(r.error);
  }

  async function resend() {
    setPending("resend");
    setError(null);
    setCode("");
    const r = await requestIntakeCodeAction({ email });
    setPending(null);
    if (r.ok) setNote("A new code is on its way. Check your inbox and spam folder.");
    else setError(r.error ?? "Could not send a code.");
  }

  return (
    <form onSubmit={verify} className={cn("space-y-4", className)} noValidate>
      <p className="text-body">
        We emailed a 6-digit code to
        <strong className="mt-0.5 block font-semibold text-ink [overflow-wrap:anywhere]">{email}</strong>
        <span className="mt-1 block text-sm text-body/75">Enter it below to open your saved form.</span>
      </p>

      <div className="space-y-1.5">
        <label htmlFor="intake-code" className="block text-sm font-medium text-body">
          6-digit code
        </label>
        {/* One real input (paste, autofill, screen readers) drawn as six boxes. */}
        <div className="relative">
          <div className="grid grid-cols-6 gap-2" aria-hidden>
            {Array.from({ length: LENGTH }, (_, i) => {
              const active = focused && (i === code.length || (i === LENGTH - 1 && code.length === LENGTH));
              return (
                <span
                  key={i}
                  className={cn(
                    "flex h-14 items-center justify-center rounded-xl border bg-surface font-display text-2xl font-semibold text-ink transition-colors",
                    error ? "border-clay" : code[i] ? "border-ink/40" : "border-line",
                    active && !error && "border-ink ring-[3px] ring-ink/15",
                  )}
                >
                  {code[i] ?? (active ? <span className="h-6 w-px animate-pulse bg-ink" /> : "")}
                </span>
              );
            })}
          </div>
          <input
            id="intake-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, LENGTH));
              setError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "intake-code-error" : undefined}
            className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
          />
        </div>
      </div>

      {error && (
        <p id="intake-code-error" role="alert" className="text-sm text-clay-text">
          {error}
        </p>
      )}
      {note && !error && (
        <p role="status" className="rounded-lg bg-leaf/10 px-3 py-2 text-sm text-leaf-text">
          {note}
        </p>
      )}

      <button
        type="submit"
        disabled={pending !== null || code.length !== LENGTH}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper transition hover:bg-ink-700 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending === "verify" && <Loader2 className="size-4 animate-spin" aria-hidden />} Open my form
      </button>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-body/75">
          Didn&apos;t get it?{" "}
          <button type="button" onClick={resend} disabled={pending !== null} className="inline-flex items-center gap-1 font-semibold text-lagoon underline-offset-2 hover:underline disabled:opacity-60">
            {pending === "resend" && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Send a new code
          </button>
        </span>
        {onBack && (
          <button type="button" onClick={onBack} className="min-h-10 text-body/75 underline underline-offset-2 hover:text-ink">
            Use a different email
          </button>
        )}
      </div>
    </form>
  );
}
