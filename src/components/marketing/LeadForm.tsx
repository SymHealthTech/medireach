"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitLeadAction, type LeadFormState } from "@/app/lead-actions";
import { cn } from "@/lib/cn";

const input =
  "h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-base text-body outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/20 aria-invalid:border-clay";

/**
 * Lead form: name, phone, city, specialty, message. Validated on the server
 * (zod), with a hidden honeypot field and rate limits. `title` shows above the
 * fields and is hidden once the form is sent (only the thank-you remains).
 */
export function LeadForm({
  source,
  compact = false,
  submitLabel = "Request a call back",
  title,
  className,
}: {
  source: "homepage_form" | "pricing" | "clinics" | "hospitals";
  compact?: boolean;
  submitLabel?: string;
  /** Heading above the form; not shown after a successful submit. */
  title?: ReactNode;
  className?: string;
}) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(submitLeadAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <div role="status" className={cn("flex items-start gap-3 rounded-xl border border-leaf/30 bg-leaf/10 p-5 text-body", className)}>
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" strokeWidth={1.75} />
        <p>Thank you. We&apos;ll call you within one working day.</p>
      </div>
    );
  }

  return (
    <>
      {title}
      <form action={action} className={cn("space-y-3", className)} noValidate>
      <input type="hidden" name="source" value={source} />
      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
        <label className="space-y-1">
          <span className="text-sm font-medium text-body">Your name</span>
          <input name="name" defaultValue={v.name} required autoComplete="name" className={input} aria-invalid={err.name ? true : undefined} />
          {err.name && <span className="text-sm text-clay-text">{err.name}</span>}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-body">Mobile number</span>
          <input name="phone" defaultValue={v.phone} required type="tel" inputMode="tel" autoComplete="tel" className={input} aria-invalid={err.phone ? true : undefined} />
          {err.phone && <span className="text-sm text-clay-text">{err.phone}</span>}
        </label>
        {!compact && (
          <>
            <label className="space-y-1">
              <span className="text-sm font-medium text-body">City</span>
              <input name="city" defaultValue={v.city ?? "Pune"} autoComplete="address-level2" className={input} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-body">Specialty</span>
              <input name="specialty" defaultValue={v.specialty} placeholder="e.g. General Physician" className={input} />
            </label>
          </>
        )}
      </div>
      {!compact && (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-body">Message (optional)</span>
          <textarea name="message" defaultValue={v.message} rows={3} className={cn(input, "h-auto py-2")} />
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-clay-text">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700 active:scale-[.98] disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="size-4 animate-spin" />} {submitLabel}
      </button>
      <p className="text-xs text-muted-foreground">
        We use your number only to call you back. See our{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
      </form>
    </>
  );
}
