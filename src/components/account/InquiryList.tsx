"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, Clock, Loader2, Mail, MapPin, MessageCircle, Phone, StickyNote } from "lucide-react";
import { updateInquiryAction } from "@/app/account/actions";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUSES, preferredLabel, type InquiryStatus, type InquiryTime } from "@/lib/inquiries";

export interface InquiryRow {
  id: string;
  name: string;
  phone: string;
  email?: string;
  clinicName?: string;
  preferredDate?: string;
  preferredTime?: InquiryTime;
  message?: string;
  status: InquiryStatus;
  note?: string;
  createdAt: string;
}

const TONE: Record<InquiryStatus, string> = {
  new: "bg-marigold/15 text-[#9a4d0c] ring-marigold/30",
  contacted: "bg-sky-100 text-sky-800 ring-sky-200",
  booked: "bg-leaf/12 text-leaf-text ring-leaf/25",
  closed: "bg-mist text-muted-foreground ring-line",
};

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** The doctor's appointment requests: call / WhatsApp / email, status and a private note, saved as you go. */
export function InquiryList({ initial, demo }: { initial: InquiryRow[]; /** Sample dashboard: changes stay on screen only. */ demo?: boolean }) {
  const [rows, setRows] = useState(initial);
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
        <CalendarDays aria-hidden className="mx-auto size-10 text-lagoon/60" strokeWidth={1.5} />
        <p className="mt-3 font-semibold text-ink">Nothing here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Requests from the form on your website show up here, and in your email.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <InquiryCard key={r.id} row={r} demo={demo} onChange={(patch) => setRows((all) => all.map((x) => (x.id === r.id ? { ...x, ...patch } : x)))} />
      ))}
    </ul>
  );
}

function InquiryCard({ row: r, demo, onChange }: { row: InquiryRow; demo?: boolean; onChange: (patch: Partial<InquiryRow>) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [note, setNote] = useState(r.note ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(r.note));
  const [saved, setSaved] = useState(false);
  const when = preferredLabel(r.preferredDate, r.preferredTime);
  const wa = `https://wa.me/91${r.phone}?text=${encodeURIComponent(`Hello ${r.name}, this is about your appointment request.`)}`;

  const save = (patch: { status?: InquiryStatus; note?: string }) =>
    start(async () => {
      setError(undefined);
      const res = demo ? ({ ok: true } as const) : await updateInquiryAction({ id: r.id, ...patch });
      if (res.ok) {
        onChange(patch);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1800);
      } else setError(res.error);
    });

  return (
    <li className={cn("rounded-2xl border bg-surface p-4 shadow-soft sm:p-5", r.status === "new" ? "border-marigold/40" : "border-line")}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mist font-display text-lg font-semibold text-ink">{r.name[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-ink">{r.name}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", TONE[r.status])}>{INQUIRY_STATUS_LABEL[r.status]}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-3.5" /> {timeAgo(r.createdAt)} · {dateTimeFmt.format(new Date(r.createdAt))}
            </span>
            {r.clinicName && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden className="size-3.5" /> {r.clinicName}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`tel:+91${r.phone}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-3.5 text-sm font-semibold text-paper hover:bg-ink-700">
            <Phone aria-hidden className="size-4" /> <span className="hidden sm:inline">{formatPhone(`91${r.phone}`)}</span>
            <span className="sm:hidden">Call</span>
          </a>
          <a href={wa} target="_blank" rel="noopener" aria-label={`WhatsApp ${r.name}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-sm font-semibold text-white">
            <MessageCircle aria-hidden className="size-4" />
          </a>
          {r.email && (
            <a href={`mailto:${r.email}`} aria-label={`Email ${r.name}`} className="inline-flex min-h-10 items-center rounded-xl border border-line px-3 text-ink hover:border-ink/40">
              <Mail aria-hidden className="size-4" />
            </a>
          )}
        </div>
      </div>

      {(when || r.message) && (
        <div className="mt-3 space-y-2 rounded-xl bg-paper px-4 py-3 text-[15px] text-body">
          {when && (
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarDays aria-hidden className="size-4 text-lagoon" /> Prefers {when}
            </p>
          )}
          {r.message && <p className="whitespace-pre-line">{r.message}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        {INQUIRY_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => s !== r.status && save({ status: s })}
            aria-pressed={s === r.status}
            className={cn(
              "inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold ring-1 transition",
              s === r.status ? cn(TONE[s], "ring-2") : "bg-surface text-body/75 ring-line hover:ring-ink/30",
            )}
          >
            {s === r.status && <Check aria-hidden className="size-3.5" />}
            {INQUIRY_STATUS_LABEL[s]}
          </button>
        ))}
        <button type="button" onClick={() => setNoteOpen((o) => !o)} className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-lagoon hover:text-ink">
          <StickyNote aria-hidden className="size-4" /> {r.note ? "Note" : "Add note"}
        </button>
        {pending && <Loader2 aria-label="Saving" className="size-4 animate-spin text-muted-foreground" />}
        {saved && !pending && <span className="text-sm text-leaf-text">Saved</span>}
      </div>

      {noteOpen && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`note-${r.id}`}>
            Private note
          </label>
          <input
            id={`note-${r.id}`}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private note, e.g. Booked for Tue 10:30"
            className="min-h-10 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-lagoon"
          />
          <button
            type="button"
            disabled={pending || note === (r.note ?? "")}
            onClick={() => save({ note })}
            className="min-h-10 rounded-xl bg-lagoon px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save note
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-clay-text">
          {error}
        </p>
      )}
    </li>
  );
}
