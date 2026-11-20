"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { endIntakeSessionAction, requestIntakeCodeAction, type IntakeSummary } from "@/app/(marketing)/get-started/actions";
import { INTAKE_KINDS, type IntakeStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { INTAKE_KIND_LABEL } from "@/lib/intake/form";
import { IntakeCodeForm } from "./IntakeCodeForm";
import { inputClass } from "./IntakeFields";

const STATUS: Record<IntakeStatus, { label: string; tone: string }> = {
  draft: { label: "Not sent yet", tone: "bg-marigold/15 text-ink" },
  submitted: { label: "Sent for review", tone: "bg-lagoon/10 text-lagoon" },
  in_review: { label: "In review", tone: "bg-lagoon/10 text-lagoon" },
  done: { label: "Website created", tone: "bg-leaf/15 text-leaf-text" },
  archived: { label: "Closed", tone: "bg-line text-body" },
};

/** Email → code → the forms saved with that email (or the list straight away with a session). */
export function ContinueForms({ sessionEmail, initialForms, defaultEmail }: { sessionEmail: string | null; initialForms: IntakeSummary[] | null; defaultEmail: string }) {
  const [email, setEmail] = useState(sessionEmail ?? defaultEmail);
  const [step, setStep] = useState<"email" | "code" | "list">(initialForms ? "list" : "email");
  const [forms, setForms] = useState<IntakeSummary[]>(initialForms ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await requestIntakeCodeAction({ email });
    setPending(false);
    if (r.ok) {
      setEmail(r.email ?? email);
      setStep("code");
    } else setError(r.error ?? "Could not send a code.");
  }

  if (step === "list") {
    const have = new Set(forms.map((f) => f.kind));
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Your forms</h1>
          <p className="mt-1 text-sm text-body/80">
            Logged in as <strong className="break-all">{email}</strong>.{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={async () => {
                await endIntakeSessionAction();
                setForms([]);
                setStep("email");
              }}
            >
              Not you?
            </button>
          </p>
        </div>
        {forms.length === 0 ? (
          <p className="rounded-xl bg-paper p-4 text-sm text-body">No forms are saved with this email yet. Start one below.</p>
        ) : (
          <ul className="space-y-3">
            {forms.map((f) => (
              <li key={f.id}>
                <Link href={`/get-started/${f.kind}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-lagoon/50 hover:shadow-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{f.name || INTAKE_KIND_LABEL[f.kind]}</span>
                    <span className="block text-sm text-body/75">
                      {INTAKE_KIND_LABEL[f.kind]} · {f.ref} · saved {new Date(f.lastSavedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS[f.status].tone)}>{STATUS[f.status].label}</span>
                  <ArrowRight className="size-4 shrink-0 text-lagoon" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {INTAKE_KINDS.some((k) => !have.has(k)) && (
          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-body">Start another form</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTAKE_KINDS.filter((k) => !have.has(k)).map((k) => (
                <Link key={k} href={`/get-started/${k}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm font-semibold text-lagoon hover:bg-lagoon/5">
                  <Plus className="size-4" aria-hidden /> {INTAKE_KIND_LABEL[k]}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Continue your form</h1>
        <p className="mt-1 text-body/80">Log in with the email you used on the form. We&apos;ll email you a one-time code.</p>
      </div>
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3" noValidate>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-body">Email</span>
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={cn(inputClass, "h-11")} aria-invalid={error ? true : undefined} />
          </label>
          {error && (
            <p role="alert" className="text-sm text-clay-text">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending || !email.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700 disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Email me a code
          </button>
          <p className="text-xs text-body/70">
            Haven&apos;t started yet?{" "}
            <Link href="/get-started" className="underline underline-offset-2">
              Choose a form
            </Link>
          </p>
        </form>
      ) : (
        <>
          <IntakeCodeForm
            email={email}
            onVerified={(r) => {
              setForms(r.forms);
              setStep("list");
            }}
            onBack={() => setStep("email")}
          />
          <p className="text-xs text-body/70">No email? Check spam. If this email has no saved form, no code is sent: start a new form instead.</p>
        </>
      )}
    </div>
  );
}
