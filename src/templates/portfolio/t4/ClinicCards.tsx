"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, IndianRupee, Map as MapIcon, MapPin, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { nowInIndia } from "@/lib/timings";
import { status, TimingsBoard, TYPE_LABEL } from "@/templates/portfolio/t2/ClinicsSection";
import type { PublicClinic } from "@/templates/types";

/**
 * Warm Heritage clinics: the main clinic is shown in full (details on the
 * left, the week's timings on the right); any other clinics sit below as
 * forest-green rows with their live open/closed status that open and close
 * on request. One clinic is open at a time.
 */
export function ClinicCards({ clinics }: { clinics: PublicClinic[] }) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  const [open, setOpen] = useState(0);
  const [maps, setMaps] = useState<Record<string, boolean>>({});
  useEffect(() => setNow(nowInIndia()), []);

  return (
    <div className="mx-auto max-w-[1080px] space-y-5">
      {clinics.map((c, i) => {
        const st = now ? status(c.timings, now) : null;
        const isOpen = open === i;
        const many = clinics.length > 1;
        return (
          <article key={c.id} className="cm-reveal overflow-hidden rounded-[26px] bg-white shadow-wh-lg ring-1 ring-wh-line">
            <header className="relative flex items-center gap-4 overflow-hidden bg-wh-forest px-6 py-5 text-wh-cream sm:px-8">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full border border-wh-saffron/25" />
              <div className="relative min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-wh-saffron">{TYPE_LABEL[c.type]}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold leading-snug sm:text-[26px]">{c.name}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-wh-cream/75">
                  {c.area.name}, {c.city.name}
                  {st && (
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", st.open ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-wh-cream/80")}>
                      <span className={cn("size-1.5 rounded-full", st.open ? "bg-emerald-300" : "bg-wh-cream/50")} />
                      {st.open ? "Open now" : "Closed now"}
                    </span>
                  )}
                </p>
              </div>
              {many && (
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`wh-clinic-${c.id}`}
                  className={cn(
                    "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition",
                    isOpen ? "bg-wh-cream/15 text-wh-cream ring-1 ring-wh-cream/30 hover:bg-wh-cream/25" : "bg-wh-terra text-white hover:bg-wh-terra-2",
                  )}
                >
                  {isOpen ? "Close" : "Open"}
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
              )}
            </header>

            <div id={`wh-clinic-${c.id}`} hidden={!isOpen}>
              {isOpen && (
                <div className="cm-rise grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="flex min-w-0 flex-col gap-5">
                    {st && <p className="font-display text-lg text-wh-terra">{st.text}</p>}
                    <ul className="space-y-3 text-[15px]">
                      <li className="flex gap-3">
                        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                        <address className="not-italic text-wh-text/85">{c.fullAddress}</address>
                      </li>
                      {c.phone && (
                        <li className="flex items-center gap-3">
                          <Phone aria-hidden className="size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                          <a href={`tel:+${c.phone}`} className="font-semibold text-wh-forest hover:text-wh-terra">
                            {formatPhone(c.phone)}
                          </a>
                        </li>
                      )}
                      {typeof c.fee === "number" && (
                        <li className="flex items-center gap-3 text-wh-text/85">
                          <IndianRupee aria-hidden className="size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                          Consultation fee <strong className="font-semibold text-wh-forest">₹{c.fee.toLocaleString("en-IN")}</strong>
                        </li>
                      )}
                    </ul>
                    {c.appointmentNote && <p className="rounded-2xl bg-wh-paper px-4 py-3 text-sm text-wh-forest">{c.appointmentNote}</p>}
                    <div className="flex flex-wrap gap-2">
                      <a href={c.directionsUrl} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-wh-forest px-5 text-sm font-semibold text-wh-cream transition hover:bg-wh-forest-2">
                        <Navigation aria-hidden className="size-4" /> Directions
                      </a>
                      {c.phone && (
                        <a href={`tel:+${c.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-wh-forest ring-1 ring-wh-line transition hover:bg-wh-paper">
                          <Phone aria-hidden className="size-4" /> Call
                        </a>
                      )}
                      {c.mapEmbedUrl && (
                        <button
                          type="button"
                          onClick={() => setMaps((m) => ({ ...m, [c.id]: !m[c.id] }))}
                          aria-expanded={!!maps[c.id]}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-wh-terra ring-1 ring-wh-line transition hover:bg-wh-paper"
                        >
                          <MapIcon aria-hidden className="size-4" /> {maps[c.id] ? "Hide map" : "Show map"}
                        </button>
                      )}
                      {c.site && (
                        <a href={c.site.url} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-wh-terra hover:underline">
                          {c.site.name} website <ArrowUpRight aria-hidden className="size-4" />
                        </a>
                      )}
                    </div>
                    {maps[c.id] && c.mapEmbedUrl && (
                      <iframe title={`Map showing ${c.name}`} src={c.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="cm-rise block h-56 w-full rounded-2xl border-0 ring-1 ring-wh-line" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <TimingsBoard timings={c.timings} />
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
