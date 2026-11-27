"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, FolderOpen, Hospital, Loader2, LogOut, Mail, MailCheck, Plus, UserRound, type LucideIcon } from "lucide-react";
import { endIntakeSessionAction, requestIntakeCodeAction, type IntakeSummary } from "@/app/(marketing)/get-started/actions";
import { INTAKE_KINDS, type IntakeKind, type IntakeStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { INTAKE_KIND_LABEL } from "@/lib/intake/form";
import { IntakeCodeForm } from "./IntakeCodeForm";
import { inputClass } from "./IntakeFields";

const STATUS: Record<IntakeStatus, { label: string; tone: string }> = {
  draft: { label: "Not sent yet", tone: "bg-marigold/15 text-ink" },
  submitted: { label: "Sent for review", tone: "bg-lagoon/10 text-lagoon" },
  in_review: { label: "In review", tone: "bg-lagoon/10 text-lagoon" },
  done: { label: "Website live", tone: "bg-leaf/15 text-leaf-text" },
  archived: { label: "Closed", tone: "bg-line text-body" },
};

const KIND_ICON: Record<IntakeKind, LucideIcon> = { doctor: UserRound, clinic: Building2, hospital: Hospital };

/** Icon badge, optional step count, title and subtitle at the top of the card. */
function Header({ icon: Icon, step, title, children }: { icon: LucideIcon; step?: string; title: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-sage text-ink">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        {step && <span className="text-xs font-semibold uppercase tracking-wider text-body/60">{step}</span>}
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.01em] text-ink sm:text-[1.75rem]">{title}</h1>
      {children && <div className="mt-1.5 text-body/80">{children}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: IntakeStatus }) {
  return <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[status].tone)}>{STATUS[status].label}</span>;
}

/** Email → code → the forms saved with that email (or the list straight away with a session). */
export function ContinueForms({ sessionEmail, initialForms, defaultEmail }: { sessionEmail: string | null; initialForms: IntakeSummary[] | null; defaultEmail: string }) {
  const [email, setEmail] = useState(sessionEmail ?? defaultEmail);
  const [step, setStep] = useState<"email" | "code" | "list">(initialForms ? "list" : "email");
  const [forms, setForms] = useState<IntakeSummary[]>(initialForms ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
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
    const missing = INTAKE_KINDS.filter((k) => !have.has(k));
    return (
      <div className="space-y-6">
        <Header icon={FolderOpen} title="Your forms">
          <p className="text-sm">
            Logged in as <strong className="break-all font-semibold text-ink">{email}</strong>
          </p>
        </Header>

        {forms.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-paper p-4 text-sm text-body">No forms are saved with this email yet. Start one below.</p>
        ) : (
          <ul className="space-y-3">
            {forms.map((f) => {
              const Icon = KIND_ICON[f.kind];
              return (
                <li key={f.id}>
                  <Link
                    href={`/get-started/${f.kind}?continue=1`}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition hover:border-lagoon/50 hover:shadow-soft sm:gap-4 sm:p-4"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-ink">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-ink">{f.name || INTAKE_KIND_LABEL[f.kind]}</span>
                      <span className="mt-0.5 block text-sm text-body/75">
                        {INTAKE_KIND_LABEL[f.kind]} · saved {new Date(f.lastSavedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <StatusPill status={f.status} />
                        <span className="text-xs text-body/60">Ref {f.ref}</span>
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-lagoon transition group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {missing.length > 0 && (
          <div className="space-y-2.5 border-t border-line pt-5">
            <p className="text-sm font-semibold text-ink">{forms.length ? "Start another form" : "Start a form"}</p>
            <div className="flex flex-wrap gap-2">
              {missing.map((k) => (
                <Link
                  key={k}
                  href={`/get-started/${k}`}
                  className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line px-3.5 text-sm font-semibold text-lagoon transition hover:border-lagoon/40 hover:bg-lagoon/5"
                >
                  <Plus className="size-4 shrink-0" aria-hidden /> {INTAKE_KIND_LABEL[k]}
                </Link>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={leaving}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-body/75 hover:text-ink disabled:opacity-60"
          onClick={async () => {
            setLeaving(true);
            await endIntakeSessionAction();
            setLeaving(false);
            setForms([]);
            setStep("email");
          }}
        >
          {leaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />} Not you? Log out
        </button>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-5">
        <Header icon={MailCheck} step="Step 2 of 2" title="Check your email" />
        <IntakeCodeForm
          email={email}
          onVerified={(r) => {
            setForms(r.forms);
            setStep("list");
          }}
          onBack={() => setStep("email")}
        />
        <p className="rounded-xl bg-paper px-4 py-3 text-xs leading-relaxed text-body/75">
          The code works once and expires in 10 minutes. No email? Check spam. If this email has no saved form, no code is sent, so start a new form instead.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header icon={Mail} step="Step 1 of 2" title="Continue your form">
        <p>Log in with the email you used on the form. We&apos;ll email you a one-time code.</p>
      </Header>
      <form onSubmit={sendCode} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="continue-email" className="block text-sm font-medium text-body">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-body/45" aria-hidden />
            <input
              id="continue-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              required
              autoFocus={!email}
              className={cn(inputClass, "h-12 pl-10")}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "continue-email-error" : undefined}
            />
          </div>
        </div>
        {error && (
          <p id="continue-email-error" role="alert" className="text-sm text-clay-text">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper transition hover:bg-ink-700 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Email me a code {!pending && <ArrowRight className="size-4" aria-hidden />}
        </button>
      </form>
      <p className="border-t border-line pt-5 text-center text-sm text-body/75">
        Haven&apos;t started yet?{" "}
        <Link href="/get-started" className="font-semibold text-lagoon underline-offset-2 hover:underline">
          Choose a form
        </Link>
      </p>
    </div>
  );
}
