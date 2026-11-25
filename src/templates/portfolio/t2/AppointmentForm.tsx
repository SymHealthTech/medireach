"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Send } from "lucide-react";
import { sendInquiryAction } from "@/app/inquiry-actions";
import { cn } from "@/lib/cn";
import { INQUIRY_TIME_LABEL, INQUIRY_TIMES, type InquiryFormState } from "@/lib/inquiries";

const field =
  "block w-full rounded-xl border border-cm-line bg-white px-4 py-3 text-[15px] text-cm-text shadow-[inset_0_1px_2px_rgb(11_37_69/0.04)] outline-none transition placeholder:text-cm-muted/60 focus:border-cm-teal focus:ring-4 focus:ring-cm-teal/15 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10";
const label = "mb-1.5 block text-sm font-semibold text-cm-navy";

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Appointment request form. Posts to a server action (works on the doctor's
 * subdomain too, since actions post to the page itself); the clinic gets the
 * request by email and in the doctor's account. It asks for a call back: it
 * never promises a confirmed slot.
 */
export function AppointmentForm({
  doctorId,
  doctorName,
  clinics,
}: {
  doctorId: string;
  doctorName: string;
  clinics: { id: string; name: string; area: string }[];
}) {
  const [state, action, pending] = useActionState<InquiryFormState, FormData>(sendInquiryAction, {});
  const [minDate, setMinDate] = useState<string>();
  const done = useRef<HTMLDivElement>(null);
  useEffect(() => setMinDate(todayIST()), []);
  useEffect(() => {
    if (state.ok) done.current?.focus();
  }, [state.ok]);

  if (state.ok) {
    return (
      <div ref={done} tabIndex={-1} role="status" className="cm-rise flex flex-col items-center px-4 py-10 text-center outline-none">
        <span className="relative flex size-16 items-center justify-center rounded-full bg-cm-mint text-cm-teal">
          <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-cm-teal/20" />
          <CheckCircle2 className="relative size-8" strokeWidth={2} />
        </span>
        <h3 className="mt-5 text-2xl font-bold text-cm-navy">Request sent</h3>
        <p className="mt-2 max-w-sm text-cm-muted">
          {state.demo
            ? "This is a demo website, so nothing was sent. On a real site the clinic gets your request by email straight away."
            : `Thank you. ${doctorName}'s clinic will call you back to confirm a time.`}
        </p>
        <p className="mt-4 text-sm text-cm-muted">For anything urgent, please call the clinic directly.</p>
      </div>
    );
  }

  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  const invalid = (k: string) => (err[k] ? { "aria-invalid": true as const, "aria-describedby": `cm-err-${k}` } : {});
  const Err = ({ k }: { k: string }) =>
    err[k] ? (
      <p id={`cm-err-${k}`} className="mt-1.5 text-sm font-medium text-red-600">
        {err[k]}
      </p>
    ) : null;

  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="doctorId" value={doctorId} />
      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="cm-name" className={label}>
          Full name <span className="text-red-500">*</span>
        </label>
        <input id="cm-name" name="name" required autoComplete="name" defaultValue={v.name} placeholder="Your name" className={field} {...invalid("name")} />
        <Err k="name" />
      </div>
      <div>
        <label htmlFor="cm-phone" className={label}>
          Mobile number <span className="text-red-500">*</span>
        </label>
        <input
          id="cm-phone"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={v.phone}
          placeholder="10-digit mobile"
          className={field}
          {...invalid("phone")}
        />
        <Err k="phone" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="cm-email" className={label}>
          Email <span className="font-normal text-cm-muted">(optional)</span>
        </label>
        <input id="cm-email" name="email" type="email" autoComplete="email" defaultValue={v.email} placeholder="you@example.com" className={field} {...invalid("email")} />
        <Err k="email" />
      </div>
      {clinics.length > 1 && (
        <div className="sm:col-span-2">
          <label htmlFor="cm-clinic" className={label}>
            Clinic
          </label>
          <select id="cm-clinic" name="clinicId" defaultValue={v.clinicId || clinics[0]!.id} className={field}>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.area}
              </option>
            ))}
          </select>
        </div>
      )}
      {clinics.length === 1 && <input type="hidden" name="clinicId" value={clinics[0]!.id} />}
      <div>
        <label htmlFor="cm-date" className={label}>
          Preferred date
        </label>
        <div className="relative">
          <input id="cm-date" name="preferredDate" type="date" min={minDate} defaultValue={v.preferredDate} className={cn(field, "pr-10")} {...invalid("preferredDate")} />
          <CalendarDays aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-cm-muted" />
        </div>
        <Err k="preferredDate" />
      </div>
      <div>
        <label htmlFor="cm-time" className={label}>
          Preferred time
        </label>
        <select id="cm-time" name="preferredTime" defaultValue={v.preferredTime || ""} className={field}>
          <option value="">No preference</option>
          {INQUIRY_TIMES.filter((t) => t !== "any").map((t) => (
            <option key={t} value={t}>
              {INQUIRY_TIME_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="cm-message" className={label}>
          How can we help?
        </label>
        <textarea
          id="cm-message"
          name="message"
          rows={4}
          maxLength={1000}
          defaultValue={v.message}
          placeholder="A few words about the reason for your visit (optional)"
          className={cn(field, "resize-y")}
          {...invalid("message")}
        />
        <Err k="message" />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-sm text-cm-muted">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-[var(--color-cm-teal)]" {...invalid("consent")} />
          <span>I agree that the clinic may call or message me about this request. My details are shared only with {doctorName}&apos;s clinic.</span>
        </label>
        <Err k="consent" />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-2">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-cm-muted">Not for emergencies. In an emergency, call 108 or go to the nearest hospital.</p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-cm-teal px-6 font-semibold text-white shadow-[0_14px_30px_-12px_rgb(13_148_136/0.9)] transition hover:-translate-y-0.5 hover:bg-cm-teal-2 disabled:translate-y-0 disabled:opacity-70"
        >
          {pending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-[18px]" strokeWidth={2} />}
          {pending ? "Sending…" : "Request appointment"}
        </button>
      </div>
    </form>
  );
}
