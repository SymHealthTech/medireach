"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Clock, IndianRupee, MapPin, Moon, Navigation, Phone, Sun, Sunset } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { DAY_NAMES, DAY_SHORT, formatTime, isOpenAt, nowInIndia, slotsForDay, WEEK_ORDER, type DayTimings } from "@/lib/timings";
import type { PublicClinic } from "@/templates/types";

const TYPE_LABEL: Record<PublicClinic["type"], string> = {
  own_clinic: "Own clinic",
  hospital_visiting: "Visiting consultant",
  other: "Clinic",
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** "Open now · closes 1:30 pm" / "Closed · opens Mon 9:30 am", in India time. */
function status(timings: DayTimings[], at: { day: number; minutes: number }): { open: boolean; text: string } {
  if (isOpenAt(timings, at)) {
    const slot = slotsForDay(timings, at.day).find((s) => toMin(s.open) <= at.minutes && at.minutes < toMin(s.close));
    return { open: true, text: slot ? `Closes at ${formatTime(slot.close)}` : "Open now" };
  }
  for (let i = 0; i < 7; i++) {
    const day = (at.day + i) % 7;
    const next = slotsForDay(timings, day).find((s) => i > 0 || toMin(s.open) > at.minutes);
    if (next) return { open: false, text: `Opens ${i === 0 ? "today" : i === 1 ? "tomorrow" : DAY_NAMES[day]} at ${formatTime(next.open)}` };
  }
  return { open: false, text: "Please call for timings" };
}

function SessionIcon({ open }: { open: string }) {
  const m = toMin(open);
  const Icon = m < 12 * 60 ? Sun : m < 17 * 60 ? Sunset : Moon;
  return <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.2} />;
}

/** The week at a glance: today highlighted, sessions as chips, live open/closed status. */
function TimingsBoard({ timings }: { timings: DayTimings[] }) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => {
    setNow(nowInIndia());
    const t = window.setInterval(() => setNow(nowInIndia()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const st = now ? status(timings, now) : null;

  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-cm-line">
      <div className="flex items-center justify-between gap-3 bg-cm-navy px-5 py-4 text-white">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-white/80">
          <Clock aria-hidden className="size-4 text-teal-300" strokeWidth={2.2} /> Weekly timings
        </p>
        {st && (
          <p className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold", st.open ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/80")}>
            <span className="relative flex size-2">
              {st.open && <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-emerald-400" />}
              <span className={cn("relative size-2 rounded-full", st.open ? "bg-emerald-400" : "bg-white/50")} />
            </span>
            {st.open ? "Open now" : "Closed now"}
          </p>
        )}
      </div>
      {st && <p className="border-b border-cm-line bg-cm-sky px-5 py-2.5 text-sm font-semibold text-cm-navy">{st.text}</p>}
      <ul className="divide-y divide-cm-line">
        {WEEK_ORDER.map((day) => {
          const slots = slotsForDay(timings, day);
          const today = now?.day === day;
          return (
            <li key={day} className={cn("flex items-center gap-4 px-5 py-3", today && "bg-cm-mint/70")}>
              <span
                className={cn(
                  "flex w-12 shrink-0 flex-col text-sm font-bold",
                  today ? "text-cm-teal-2" : slots.length ? "text-cm-navy" : "text-cm-muted/70",
                )}
              >
                {DAY_SHORT[day]}
                {today && <span className="text-[10px] font-bold uppercase tracking-wider text-cm-teal">Today</span>}
              </span>
              {slots.length ? (
                <span className="flex flex-1 flex-wrap justify-end gap-2">
                  {slots.map((s) => (
                    <span
                      key={`${s.open}-${s.close}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold",
                        today ? "bg-cm-teal text-white" : "bg-cm-blue-soft text-cm-navy",
                      )}
                    >
                      <SessionIcon open={s.open} />
                      {formatTime(s.open)} – {formatTime(s.close)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="flex-1 text-right text-sm font-medium text-cm-muted/70">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ClinicDetails({ c, photo, showMap }: { c: PublicClinic; photo: string; showMap: boolean }) {
  return (
    <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      <div className="min-w-0 space-y-5">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
          <Image src={photo} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-cm-navy/60 to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-cm-navy backdrop-blur">{TYPE_LABEL[c.type]}</span>
        </div>
        <ul className="space-y-3 text-[15px]">
          <li className="flex gap-3">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-cm-teal" strokeWidth={1.9} />
            <address className="not-italic text-cm-text/85">{c.fullAddress}</address>
          </li>
          {c.phone && (
            <li className="flex items-center gap-3">
              <Phone aria-hidden className="size-5 shrink-0 text-cm-teal" strokeWidth={1.9} />
              <a href={`tel:+${c.phone}`} className="font-semibold text-cm-navy hover:text-cm-teal">
                {formatPhone(c.phone)}
              </a>
            </li>
          )}
          {typeof c.fee === "number" && (
            <li className="flex items-center gap-3 text-cm-text/85">
              <IndianRupee aria-hidden className="size-5 shrink-0 text-cm-teal" strokeWidth={1.9} />
              Consultation fee <strong className="font-bold text-cm-navy">₹{c.fee.toLocaleString("en-IN")}</strong>
            </li>
          )}
        </ul>
        {c.appointmentNote && <p className="rounded-2xl bg-cm-mint px-4 py-3 text-sm font-medium text-cm-teal-2">{c.appointmentNote}</p>}
        <div className="flex flex-wrap gap-2">
          <a href={c.directionsUrl} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cm-navy px-4 text-sm font-semibold text-white transition hover:bg-cm-navy-2">
            <Navigation aria-hidden className="size-4" strokeWidth={2} /> Get directions
          </a>
          {c.phone && (
            <a href={`tel:+${c.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-cm-navy ring-1 ring-cm-line transition hover:bg-cm-sky">
              <Phone aria-hidden className="size-4" strokeWidth={2} /> Call
            </a>
          )}
          {c.site && (
            <a href={c.site.url} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-cm-blue hover:underline">
              {c.site.name} website <ArrowUpRight aria-hidden className="size-4" />
            </a>
          )}
        </div>
      </div>
      <div className="min-w-0 space-y-4">
        <TimingsBoard timings={c.timings} />
        {showMap && c.mapEmbedUrl && (
          <iframe
            title={`Map showing ${c.name}`}
            src={c.mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-56 w-full rounded-3xl border-0 ring-1 ring-cm-line"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Clinics: one clinic open at a time. The first is shown in full (photo and
 * details on the left, weekly timings and a small map on the right); the
 * others are short rows that open on demand.
 */
export function ClinicsSection({ clinics, photos }: { clinics: PublicClinic[]; photos: string[] }) {
  const [open, setOpen] = useState(0);
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => setNow(nowInIndia()), []);

  return (
    <div className="space-y-4">
      {clinics.map((c, i) => {
        const isOpen = open === i;
        const st = now ? status(c.timings, now) : null;
        return (
          <article key={c.id} className={cn("cm-reveal overflow-hidden rounded-[28px] bg-white ring-1 ring-cm-line transition-shadow", isOpen ? "shadow-cm-lg" : "shadow-cm")}>
            <div className="flex items-center gap-4 px-5 py-4 sm:px-7">
              <span className="relative hidden size-14 shrink-0 overflow-hidden rounded-2xl sm:block">
                <Image src={photos[i]!} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-extrabold text-cm-navy sm:text-2xl">{c.name}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cm-muted">
                  <span>
                    {c.area.name}, {c.city.name}
                  </span>
                  <span className="rounded-full bg-cm-sky px-2.5 py-0.5 text-xs font-semibold text-cm-navy">{TYPE_LABEL[c.type]}</span>
                  {st && (
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", st.open ? "text-emerald-600" : "text-cm-muted")}>
                      <span className={cn("size-1.5 rounded-full", st.open ? "bg-emerald-500" : "bg-cm-muted/50")} />
                      {st.open ? "Open now" : "Closed now"}
                    </span>
                  )}
                </p>
              </div>
              {clinics.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`clinic-${c.id}`}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                    isOpen ? "bg-cm-sky text-cm-navy hover:bg-cm-blue-soft" : "bg-cm-teal text-white hover:bg-cm-teal-2",
                  )}
                >
                  {isOpen ? "Close" : "Open"}
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
              )}
            </div>
            <div id={`clinic-${c.id}`} hidden={!isOpen} className="border-t border-cm-line">
              {isOpen && <ClinicDetails c={c} photo={photos[i]!} showMap />}
            </div>
          </article>
        );
      })}
    </div>
  );
}
