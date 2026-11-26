"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, ClipboardList, IndianRupee, MapPin, Navigation, Phone, Stethoscope } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { nowInIndia } from "@/lib/timings";
import { status, TYPE_LABEL } from "@/templates/portfolio/t2/ClinicsSection";
import type { PublicClinic } from "@/templates/types";
import { ScheduleMatrix } from "./Interactive";

/**
 * Specialist Pro clinics: one clinic at a time. The first is open: its
 * details, buttons and a small map on the left, its own weekly timetable on
 * the right. Other clinics sit below as rows with a live open/closed status
 * that open on request (and close the one above).
 */
export function ClinicPanels({ clinics }: { clinics: PublicClinic[] }) {
  const [open, setOpen] = useState(0);
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => setNow(nowInIndia()), []);
  const many = clinics.length > 1;

  return (
    <div className="space-y-4">
      {clinics.map((c, i) => {
        const isOpen = open === i;
        const st = now ? status(c.timings, now) : null;
        return (
          <article key={c.id} className={cn("cm-reveal overflow-hidden rounded-2xl bg-white ring-1 ring-sp-line", isOpen ? "shadow-sp-lg" : "shadow-sp")}>
            <div className="flex items-center gap-4 px-5 py-4 sm:px-7">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sp-blush text-sp-crimson">
                <Stethoscope aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sp-cyan">{TYPE_LABEL[c.type]}</p>
                <h3 className="mt-0.5 text-xl font-bold text-sp-slate">{c.name}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-sp-muted">
                  {c.area.name}, {c.city.name}
                  {st && (
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", st.open ? "text-emerald-600" : "text-sp-muted")}>
                      <span className={cn("size-1.5 rounded-full", st.open ? "bg-emerald-500" : "bg-sp-muted/50")} />
                      {st.open ? "Open now" : "Closed now"} · {st.text}
                    </span>
                  )}
                </p>
              </div>
              {many && (
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`sp-clinic-${c.id}`}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                    isOpen ? "bg-sp-ice text-sp-slate ring-1 ring-sp-line hover:bg-sp-line" : "bg-sp-crimson text-white hover:bg-sp-crimson-2",
                  )}
                >
                  {isOpen ? "Close" : "Open"}
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
              )}
            </div>

            <div id={`sp-clinic-${c.id}`} hidden={!isOpen}>
              {isOpen && (
                <div className="cm-rise grid gap-6 border-t border-sp-line p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="flex min-w-0 flex-col">
                    <ul className="space-y-2.5 text-[15px]">
                      <li className="flex gap-3">
                        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-sp-crimson" strokeWidth={1.9} />
                        <address className="not-italic text-sp-text/85">{c.fullAddress}</address>
                      </li>
                      {c.phone && (
                        <li className="flex items-center gap-3">
                          <Phone aria-hidden className="size-5 shrink-0 text-sp-crimson" strokeWidth={1.9} />
                          <a href={`tel:+${c.phone}`} className="font-semibold text-sp-slate hover:text-sp-crimson">
                            {formatPhone(c.phone)}
                          </a>
                        </li>
                      )}
                      {typeof c.fee === "number" && (
                        <li className="flex items-center gap-3 text-sp-text/85">
                          <IndianRupee aria-hidden className="size-5 shrink-0 text-sp-crimson" strokeWidth={1.9} />
                          Consultation fee <strong className="font-bold text-sp-slate">₹{c.fee.toLocaleString("en-IN")}</strong>
                        </li>
                      )}
                      {c.appointmentNote && (
                        <li className="flex gap-3 text-sp-text/85">
                          <ClipboardList aria-hidden className="mt-0.5 size-5 shrink-0 text-sp-crimson" strokeWidth={1.9} />
                          {c.appointmentNote}
                        </li>
                      )}
                    </ul>
                    <div className="mt-auto grid gap-4 pt-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div className="flex flex-col gap-2">
                        <a
                          href={c.directionsUrl}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sp-slate px-4 text-sm font-semibold text-white transition hover:bg-sp-slate-2"
                        >
                          <Navigation aria-hidden className="size-4" /> Directions
                        </a>
                        {c.phone && (
                          <a
                            href={`tel:+${c.phone}`}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-sp-slate ring-1 ring-sp-line transition hover:bg-sp-ice"
                          >
                            <Phone aria-hidden className="size-4" /> Call
                          </a>
                        )}
                        {c.site && (
                          <a href={c.site.url} className="inline-flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-sp-crimson hover:underline">
                            {c.site.name} website <ArrowUpRight aria-hidden className="size-4" />
                          </a>
                        )}
                      </div>
                      {c.mapEmbedUrl && (
                        <iframe
                          title={`Map showing ${c.name}`}
                          src={c.mapEmbedUrl}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="block h-36 w-full rounded-xl border-0 ring-1 ring-sp-line sm:h-full sm:min-h-[100px]"
                        />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <ScheduleMatrix clinics={[c]} reveal={false} />
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
