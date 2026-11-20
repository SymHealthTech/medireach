"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { requestIntakeCodeAction, verifyIntakeCodeAction, type VerifyIntakeResult } from "@/app/(marketing)/get-started/actions";
import type { IntakeKind } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { inputClass } from "./IntakeFields";

type Verified = Extract<VerifyIntakeResult, { ok: true }>;

/** "Enter the 6-digit code we emailed to …", with resend. The code was already sent when this shows. */
export function IntakeCodeForm({ email, kind, onVerified, onBack, className }: { email: string; kind?: IntakeKind; onVerified: (r: Verified) => void; onBack?: () => void; className?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<"verify" | "resend" | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
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
    const r = await requestIntakeCodeAction({ email });
    setPending(null);
    if (r.ok) setNote("A new code is on its way. Check your inbox and spam folder.");
    else setError(r.error ?? "Could not send a code.");
  }

  return (
    <form onSubmit={verify} className={cn("space-y-3", className)} noValidate>
      <p className="text-body">
        We emailed a 6-digit code to <strong className="break-all">{email}</strong>. Enter it to open your saved form.
      </p>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-body">Code</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, "h-12 max-w-[12rem] text-center font-display text-2xl tracking-[0.4em]")}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-clay-text">
          {error}
        </p>
      )}
      {note && !error && (
        <p role="status" className="text-sm text-leaf-text">
          {note}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending !== null || code.length !== 6}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700 disabled:opacity-60"
        >
          {pending === "verify" && <Loader2 className="size-4 animate-spin" aria-hidden />} Open my form
        </button>
        <button type="button" onClick={resend} disabled={pending !== null} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-lagoon hover:bg-lagoon/10 disabled:opacity-60">
          {pending === "resend" && <Loader2 className="size-4 animate-spin" aria-hidden />} Send a new code
        </button>
        {onBack && (
          <button type="button" onClick={onBack} className="min-h-11 px-3 text-sm text-body/80 underline underline-offset-2">
            Use a different email
          </button>
        )}
      </div>
    </form>
  );
}
